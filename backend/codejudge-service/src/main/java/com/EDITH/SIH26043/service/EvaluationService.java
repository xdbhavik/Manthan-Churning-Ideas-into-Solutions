package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.EvaluationReport;
import com.EDITH.SIH26043.entity.ProjectSubmission;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCategoryScoreRepository;
import com.EDITH.SIH26043.repository.EvaluationFindingRepository;
import com.EDITH.SIH26043.repository.EvaluationReportRepository;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import com.EDITH.SIH26043.repository.ProjectSubmissionRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.CategoryScoreResponse;
import com.EDITH.SIH26043.web.dto.EvaluationCreateRequest;
import com.EDITH.SIH26043.web.dto.EvaluationDetailResponse;
import com.EDITH.SIH26043.web.dto.EvaluationReportResponse;
import com.EDITH.SIH26043.web.dto.EvaluationScoreResponse;
import com.EDITH.SIH26043.web.dto.EvaluationSummaryResponse;
import com.EDITH.SIH26043.web.dto.FindingResponse;
import com.EDITH.SIH26043.web.dto.StatusHistoryResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Intake + read model for evaluations.
 *
 * <p>Create is deliberately fast — it validates the payload, writes the pinned
 * {@code project_submission} plus a {@code QUEUED} evaluation and enqueues a job,
 * then returns. The long-running pipeline is the worker's business (§8).</p>
 *
 * <p>Reads are ownership-scoped: the submission owner sees their own runs, while
 * EVALUATOR/REVIEWER/ADMIN may read any. Nothing here mutates scores; the
 * deterministic engine owns those.</p>
 */
@Service
public class EvaluationService {

    private static final int DEFAULT_PRIORITY = 5;

    private final ProjectSubmissionRepository submissionRepository;
    private final EvaluationRepository evaluationRepository;
    private final EvaluationStatusHistoryRepository historyRepository;
    private final EvaluationCategoryScoreRepository categoryScoreRepository;
    private final EvaluationFindingRepository findingRepository;
    private final EvaluationReportRepository reportRepository;
    private final JobQueueService jobQueueService;
    private final ProblemContextGateway problemContextGateway;

    public EvaluationService(ProjectSubmissionRepository submissionRepository,
                            EvaluationRepository evaluationRepository,
                            EvaluationStatusHistoryRepository historyRepository,
                            EvaluationCategoryScoreRepository categoryScoreRepository,
                            EvaluationFindingRepository findingRepository,
                            EvaluationReportRepository reportRepository,
                            JobQueueService jobQueueService,
                            ProblemContextGateway problemContextGateway) {
        this.submissionRepository = submissionRepository;
        this.evaluationRepository = evaluationRepository;
        this.historyRepository = historyRepository;
        this.categoryScoreRepository = categoryScoreRepository;
        this.findingRepository = findingRepository;
        this.reportRepository = reportRepository;
        this.jobQueueService = jobQueueService;
        this.problemContextGateway = problemContextGateway;
    }

    /**
     * Create a submission + QUEUED evaluation and enqueue its job.
     *
     * @param ownerUserId the JWT subject the submission belongs to (the caller, or
     *                    the portal-supplied owner on the internal route)
     */
    @Transactional
    public Evaluation create(EvaluationCreateRequest request, UUID ownerUserId) {
        validateRepositoryUrl(request.repositoryUrl());

        // Idempotency for the portal hand-off: a retried push (double click, gateway
        // retry) for the same submission at the same commit IS the same evaluation
        // request, so hand back the run already queued for it instead of judging the
        // same commit twice. A FAILED run is not handed back — it is worth a retry.
        if (request.portalSubmissionId() != null) {
            Optional<Evaluation> existing =
                    findLiveEvaluation(request.portalSubmissionId(), request.commitSha().trim());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        ProjectSubmission submission = new ProjectSubmission();
        submission.setPortalSubmissionId(request.portalSubmissionId());
        submission.setProblemId(request.problemId());
        submission.setProblemTitle(request.problemTitle());
        submission.setTeamId(request.teamId());
        submission.setOwnerUserId(ownerUserId);
        submission.setRepositoryUrl(request.repositoryUrl().trim());
        submission.setBranch(request.branch());
        submission.setCommitSha(request.commitSha().trim());
        submission.setDemoUrl(request.demoUrl());
        submission.setDocumentationUrl(request.documentationUrl());
        snapshotProblemContext(submission, request.problemId());
        // Reassign: save() on a new entity whose @Version is pre-set (1) goes through
        // merge(), which returns a managed copy — the original stays transient with a
        // null submissionId until flush. The returned copy has its @PrePersist id.
        submission = submissionRepository.save(submission);

        Evaluation evaluation = new Evaluation();
        evaluation.setSubmissionId(submission.getSubmissionId());
        evaluation.setStatus(EvaluationStatus.QUEUED);
        evaluation = evaluationRepository.save(evaluation);

        jobQueueService.enqueue(evaluation.getEvaluationId(), DEFAULT_PRIORITY);
        return evaluation;
    }

    /**
     * The evaluation already queued for this exact portal hand-off, if any. Skipped
     * when the newest run for the submission is FAILED, so a broken run can be
     * retried rather than being returned forever.
     */
    private Optional<Evaluation> findLiveEvaluation(UUID portalSubmissionId, String commitSha) {
        return submissionRepository
                .findFirstByPortalSubmissionIdAndCommitSha(portalSubmissionId, commitSha)
                .flatMap(existing -> evaluationRepository
                        .findBySubmissionIdOrderByCreatedAtDesc(existing.getSubmissionId())
                        .stream()
                        .filter(e -> e.getStatus() != EvaluationStatus.FAILED)
                        .findFirst());
    }

    /**
     * Attach the problem-statement snapshot from problem-service, best-effort.
     *
     * <p>The gateway never throws: when problem-service is unreachable the snapshot
     * is simply absent and the evaluation still runs, reporting whatever statement
     * detail the caller supplied. The statement is context for the report, never a
     * scoring input — see {@code ScoringEngine}.</p>
     */
    private void snapshotProblemContext(ProjectSubmission submission, UUID problemId) {
        ProblemContextResponse context = problemContextGateway.fetch(problemId);
        if (context == null) {
            return;
        }
        // The caller's title stays authoritative: the portal knows the title the
        // student actually saw, while this snapshot is the durable fallback.
        if (submission.getProblemTitle() == null || submission.getProblemTitle().isBlank()) {
            submission.setProblemTitle(context.title());
        }
        submission.setProblemDescription(context.description());
        submission.setProblemExpectedOutcome(context.expectedOutcome());
        submission.setProblemDomains(context.domains() == null
                ? new ArrayList<>() : new ArrayList<>(context.domains()));
        submission.setProblemStatus(context.status());
    }

    /**
     * Re-run on a (possibly) new commit: a brand-new evaluation over the same or an
     * updated submission. Never mutates the previous run, so historical reports
     * stay truthful.
     */
    @Transactional
    public Evaluation reevaluate(UUID evaluationId) {
        Evaluation previous = requireEvaluation(evaluationId);
        ProjectSubmission submission = requireSubmission(previous.getSubmissionId());

        Evaluation fresh = new Evaluation();
        fresh.setSubmissionId(submission.getSubmissionId());
        fresh.setStatus(EvaluationStatus.QUEUED);
        // Reassign from the managed copy (see create(): @Version pre-set ⇒ merge()).
        fresh = evaluationRepository.save(fresh);
        jobQueueService.enqueue(fresh.getEvaluationId(), DEFAULT_PRIORITY);
        return fresh;
    }

    /** Re-queue a FAILED evaluation's own job (same evaluation id, fresh attempt). */
    @Transactional
    public Evaluation retry(UUID evaluationId) {
        Evaluation evaluation = requireEvaluation(evaluationId);
        if (evaluation.getStatus() != EvaluationStatus.FAILED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Evaluation " + evaluationId + " is " + evaluation.getStatus()
                            + "; only a FAILED evaluation can be retried (use reevaluate otherwise)");
        }
        evaluation.setStatus(EvaluationStatus.QUEUED);
        evaluation.setCompletedAt(null);
        evaluationRepository.save(evaluation);
        jobQueueService.retry(evaluationId, DEFAULT_PRIORITY);
        return evaluation;
    }

    @Transactional(readOnly = true)
    public EvaluationDetailResponse detail(UUID evaluationId, AuthUser caller) {
        Evaluation evaluation = requireReadable(evaluationId, caller);
        ProjectSubmission submission = submissionRepository.findById(evaluation.getSubmissionId()).orElse(null);
        List<StatusHistoryResponse> history = historyRepository
                .findByEvaluationIdOrderByCreatedAtAsc(evaluationId).stream()
                .map(StatusHistoryResponse::from)
                .toList();
        return EvaluationDetailResponse.from(evaluation, submission, history);
    }

    @Transactional(readOnly = true)
    public EvaluationScoreResponse score(UUID evaluationId, AuthUser caller) {
        Evaluation evaluation = requireReadable(evaluationId, caller);
        List<CategoryScoreResponse> categories = categoryScoreRepository
                .findByEvaluationIdOrderByCategoryKeyAsc(evaluationId).stream()
                .map(CategoryScoreResponse::from)
                .toList();
        return new EvaluationScoreResponse(evaluationId, evaluation.getStatus(),
                evaluation.getScoringVersion(), evaluation.getFinalScore(),
                evaluation.getVerdict(), categories);
    }

    @Transactional(readOnly = true)
    public List<FindingResponse> findings(UUID evaluationId, AuthUser caller) {
        requireReadable(evaluationId, caller);
        return findingRepository.findByEvaluationIdOrderBySeverityDescCreatedAtAsc(evaluationId).stream()
                .map(FindingResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EvaluationReportResponse report(UUID evaluationId, AuthUser caller) {
        Evaluation evaluation = requireReadable(evaluationId, caller);
        EvaluationReport report = reportRepository.findByEvaluationId(evaluationId)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "No report yet for evaluation " + evaluationId
                                + " (status " + evaluation.getStatus() + ")"));
        return EvaluationReportResponse.from(report);
    }

    /** Runs the caller may see: their own submissions, or everything for staff. */
    @Transactional(readOnly = true)
    public List<EvaluationDetailResponse> list(AuthUser caller, EvaluationStatus status) {
        List<Evaluation> evaluations = status == null
                ? evaluationRepository.findAll()
                : evaluationRepository.findByStatusOrderByCreatedAtDesc(status);
        return evaluations.stream()
                .map(e -> new Object[]{e, submissionRepository.findById(e.getSubmissionId()).orElse(null)})
                .filter(pair -> canRead(caller, (ProjectSubmission) pair[1]))
                .map(pair -> EvaluationDetailResponse.from((Evaluation) pair[0],
                        (ProjectSubmission) pair[1], List.of()))
                .toList();
    }

    /**
     * Trusted summary for a calling service (no ownership scoping — the internal
     * surface is only reachable off-gateway). Feeds the verdict + breakdown to a
     * human reviewer in portal/evaluation-service.
     */
    @Transactional(readOnly = true)
    public EvaluationSummaryResponse summary(UUID evaluationId) {
        Evaluation evaluation = requireEvaluation(evaluationId);
        ProjectSubmission submission = submissionRepository.findById(evaluation.getSubmissionId()).orElse(null);
        List<CategoryScoreResponse> categories = categoryScoreRepository
                .findByEvaluationIdOrderByCategoryKeyAsc(evaluationId).stream()
                .map(CategoryScoreResponse::from)
                .toList();
        List<FindingResponse> findings = findingRepository
                .findByEvaluationIdOrderBySeverityDescCreatedAtAsc(evaluationId).stream()
                .map(FindingResponse::from)
                .toList();
        return EvaluationSummaryResponse.of(evaluation,
                submission == null ? null : submission.getPortalSubmissionId(),
                categories, findings);
    }

    // -- guards -------------------------------------------------------------

    private Evaluation requireReadable(UUID evaluationId, AuthUser caller) {
        Evaluation evaluation = requireEvaluation(evaluationId);
        ProjectSubmission submission = submissionRepository.findById(evaluation.getSubmissionId()).orElse(null);
        if (!canRead(caller, submission)) {
            // 404, not 403: a caller must not learn that someone else's evaluation exists.
            throw new ApiException(HttpStatus.NOT_FOUND, "Evaluation " + evaluationId + " not found");
        }
        return evaluation;
    }

    private static boolean canRead(AuthUser caller, ProjectSubmission submission) {
        if (caller == null) {
            return false;
        }
        if (isStaff(caller)) {
            return true;
        }
        return submission != null && caller.getUserId() != null
                && caller.getUserId().equals(submission.getOwnerUserId());
    }

    private static boolean isStaff(AuthUser caller) {
        UserRole role = caller.getRole();
        return role == UserRole.ADMIN || role == UserRole.REVIEWER || role == UserRole.EVALUATOR;
    }

    private Evaluation requireEvaluation(UUID evaluationId) {
        return evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation " + evaluationId + " not found"));
    }

    private ProjectSubmission requireSubmission(UUID submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Submission " + submissionId + " not found"));
    }

    /**
     * Scheme policy (§7): only https / ssh remotes are accepted from callers.
     * {@code file://} and bare local paths are allowed too — that is how the
     * offline compose e2e feeds a checkout in without network access — but they
     * must be absolute so a relative path cannot escape into the service CWD.
     */
    private static void validateRepositoryUrl(String url) {
        String u = url == null ? "" : url.trim().toLowerCase(Locale.ROOT);
        if (u.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "repositoryUrl is required");
        }
        if (u.startsWith("http://")) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Plain http:// repositories are rejected; use https://");
        }
        boolean remote = u.startsWith("https://") || u.startsWith("ssh://") || u.startsWith("git@");
        boolean local = u.startsWith("file:///") || u.startsWith("/") || u.matches("^[a-z]:[/\\\\].*");
        if (!remote && !local) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "repositoryUrl must be an https/ssh remote or an absolute local path");
        }
    }
}
