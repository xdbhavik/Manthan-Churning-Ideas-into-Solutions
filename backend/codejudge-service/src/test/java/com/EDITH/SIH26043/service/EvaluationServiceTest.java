package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.EvaluationCategoryScore;
import com.EDITH.SIH26043.entity.EvaluationReport;
import com.EDITH.SIH26043.entity.ProjectSubmission;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.enums.Verdict;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCategoryScoreRepository;
import com.EDITH.SIH26043.repository.EvaluationFindingRepository;
import com.EDITH.SIH26043.repository.EvaluationReportRepository;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import com.EDITH.SIH26043.repository.ProjectSubmissionRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.EvaluationCreateRequest;
import com.EDITH.SIH26043.web.dto.EvaluationDetailResponse;
import com.EDITH.SIH26043.web.dto.EvaluationScoreResponse;
import com.EDITH.SIH26043.web.dto.EvaluationSummaryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Intake + read model. Create must be fast and queue the work (never run the
 * pipeline inline), the pinned commit is mandatory, plain http remotes are refused,
 * and reads are ownership-scoped: another student's evaluation is a 404, not a 403,
 * so its existence is not leaked.
 */
class EvaluationServiceTest {

    private final ProjectSubmissionRepository submissionRepository = mock(ProjectSubmissionRepository.class);
    private final EvaluationRepository evaluationRepository = mock(EvaluationRepository.class);
    private final EvaluationStatusHistoryRepository historyRepository =
            mock(EvaluationStatusHistoryRepository.class);
    private final EvaluationCategoryScoreRepository categoryScoreRepository =
            mock(EvaluationCategoryScoreRepository.class);
    private final EvaluationFindingRepository findingRepository = mock(EvaluationFindingRepository.class);
    private final EvaluationReportRepository reportRepository = mock(EvaluationReportRepository.class);
    private final JobQueueService jobQueueService = mock(JobQueueService.class);
    private final ProblemContextGateway problemContextGateway = mock(ProblemContextGateway.class);

    private final EvaluationService service = new EvaluationService(
            submissionRepository, evaluationRepository, historyRepository,
            categoryScoreRepository, findingRepository, reportRepository, jobQueueService,
            problemContextGateway);

    private final UUID ownerUserId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    private final AuthUser owner = new AuthUser(ownerUserId, "9900000001",
            UserRole.SUBMITTER, KycStatus.VERIFIED);
    private final AuthUser otherStudent = new AuthUser(UUID.randomUUID(), "9900000002",
            UserRole.SUBMITTER, KycStatus.VERIFIED);
    private final AuthUser evaluator = new AuthUser(UUID.randomUUID(), "9700000001",
            UserRole.EVALUATOR, KycStatus.VERIFIED);

    @Test
    void createPinsTheSubmissionQueuesTheEvaluationAndReturnsImmediately() {
        stubSaves();

        Evaluation evaluation = service.create(request("https://github.com/team/project", "abc1234"), ownerUserId);

        assertThat(evaluation.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
        verify(jobQueueService).enqueue(eq(evaluation.getEvaluationId()), anyInt());

        ProjectSubmission saved = captureSubmission();
        assertThat(saved.getOwnerUserId()).isEqualTo(ownerUserId);
        assertThat(saved.getProblemId()).isEqualTo(problemId);
        assertThat(saved.getCommitSha()).isEqualTo("abc1234");
        assertThat(saved.getRepositoryUrl()).isEqualTo("https://github.com/team/project");
    }

    @Test
    void createRejectsPlainHttpRemotes() {
        assertThatThrownBy(() -> service.create(request("http://github.com/team/p", "abc1234"), ownerUserId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("https");
        verify(jobQueueService, never()).enqueue(any(), anyInt());
    }

    @Test
    void createRejectsARelativeLocalPathThatCouldEscapeTheServiceWorkingDirectory() {
        assertThatThrownBy(() -> service.create(request("../../etc", "abc1234"), ownerUserId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("absolute local path");
    }

    @Test
    void createAcceptsAFileUrlSoAnOfflineRunCanFeedALocalCheckout() {
        stubSaves();

        Evaluation evaluation = service.create(
                request("file:///srv/checkouts/project", "abc1234"), ownerUserId);

        assertThat(evaluation.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
    }

    // ----------------------------------------- problem snapshot + portal hand-off

    @Test
    void createSnapshotsTheProblemStatementForTheReport() {
        stubSaves();
        when(problemContextGateway.fetch(problemId)).thenReturn(problemContext());

        service.create(request("https://github.com/team/project", "abc1234"), ownerUserId);

        ProjectSubmission saved = captureSubmission();
        // The caller's title stays authoritative: the portal knows the title the
        // student actually saw, the snapshot is only the durable fallback.
        assertThat(saved.getProblemTitle()).isEqualTo("Water logging in ward 4");
        assertThat(saved.getProblemDescription())
                .isEqualTo("Storm drains overflow every monsoon.");
        assertThat(saved.getProblemExpectedOutcome()).isEqualTo("Dry wards through the monsoon.");
        assertThat(saved.getProblemDomains()).containsExactly("CIVIC_INFRASTRUCTURE", "WATER");
        assertThat(saved.getProblemStatus()).isEqualTo("PUBLISHED");
    }

    @Test
    void createFallsBackToTheSnapshotTitleWhenTheCallerSuppliesNone() {
        stubSaves();
        when(problemContextGateway.fetch(problemId)).thenReturn(problemContext());
        EvaluationCreateRequest anonymous = new EvaluationCreateRequest(null, problemId, null,
                null, "https://github.com/team/project", "main", "abc1234", null, null);

        service.create(anonymous, ownerUserId);

        assertThat(captureSubmission().getProblemTitle())
                .isEqualTo("Ward 4 storm-water logging");
    }

    @Test
    void createStillQueuesWhenTheProblemContextIsUnavailable() {
        stubSaves();
        when(problemContextGateway.fetch(problemId)).thenReturn(null);

        Evaluation evaluation = service.create(
                request("https://github.com/team/project", "abc1234"), ownerUserId);

        assertThat(evaluation.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
        ProjectSubmission saved = captureSubmission();
        assertThat(saved.getProblemDescription()).isNull();
        assertThat(saved.getProblemDomains()).isEmpty();
    }

    @Test
    void createHandsBackTheRunAlreadyQueuedForTheSamePortalSubmission() {
        Evaluation existing = evaluation(EvaluationStatus.QUEUED);
        UUID portalSubmissionId = UUID.randomUUID();
        when(submissionRepository.findFirstByPortalSubmissionIdAndCommitSha(portalSubmissionId, "abc1234"))
                .thenReturn(Optional.of(submission(ownerUserId, existing)));
        when(evaluationRepository.findBySubmissionIdOrderByCreatedAtDesc(existing.getSubmissionId()))
                .thenReturn(List.of(existing));

        Evaluation result = service.create(portalRequest(portalSubmissionId, "abc1234"), ownerUserId);

        // A retried push is the same request — not a second run over the same commit.
        assertThat(result).isSameAs(existing);
        verify(submissionRepository, never()).save(any());
        verify(jobQueueService, never()).enqueue(any(), anyInt());
    }

    @Test
    void createRetriesWhenTheOnlyRunForThatCommitFailed() {
        Evaluation failed = evaluation(EvaluationStatus.FAILED);
        UUID portalSubmissionId = UUID.randomUUID();
        when(submissionRepository.findFirstByPortalSubmissionIdAndCommitSha(portalSubmissionId, "abc1234"))
                .thenReturn(Optional.of(submission(ownerUserId, failed)));
        when(evaluationRepository.findBySubmissionIdOrderByCreatedAtDesc(failed.getSubmissionId()))
                .thenReturn(List.of(failed));
        stubSaves();

        Evaluation result = service.create(portalRequest(portalSubmissionId, "abc1234"), ownerUserId);

        // A FAILED run is worth a retry rather than being handed back forever.
        assertThat(result).isNotSameAs(failed);
        assertThat(result.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
        verify(jobQueueService).enqueue(eq(result.getEvaluationId()), anyInt());
    }

    @Test
    void detailReturnsTheSubmissionContextAndTransitionTrail() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(historyRepository.findByEvaluationIdOrderByCreatedAtAsc(evaluation.getEvaluationId()))
                .thenReturn(List.of());

        EvaluationDetailResponse detail = service.detail(evaluation.getEvaluationId(), owner);

        assertThat(detail.evaluationId()).isEqualTo(evaluation.getEvaluationId());
        assertThat(detail.commitSha()).isEqualTo("abc1234");
        assertThat(detail.problemId()).isEqualTo(problemId);
        assertThat(detail.status()).isEqualTo(EvaluationStatus.COMPLETED);
    }

    @Test
    void anotherStudentGetsA404RatherThanLearningTheEvaluationExists() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));

        assertThatThrownBy(() -> service.detail(evaluation.getEvaluationId(), otherStudent))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void staffMayReadAnyEvaluation() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(historyRepository.findByEvaluationIdOrderByCreatedAtAsc(evaluation.getEvaluationId()))
                .thenReturn(List.of());

        assertThat(service.detail(evaluation.getEvaluationId(), evaluator)).isNotNull();
    }

    @Test
    void scoreReportsEveryCategoryIncludingTheNotEvaluatedOnes() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        evaluation.setFinalScore(45.0);
        evaluation.setVerdict(Verdict.NEEDS_WORK);
        evaluation.setScoringVersion("deterministic-1");
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(categoryScoreRepository.findByEvaluationIdOrderByCategoryKeyAsc(evaluation.getEvaluationId()))
                .thenReturn(List.of(
                        categoryScore("ENGINEERING", 15, "EVALUATED"),
                        categoryScore("FUNCTIONAL", 0, "NOT_EVALUATED")));

        EvaluationScoreResponse score = service.score(evaluation.getEvaluationId(), owner);

        assertThat(score.finalScore()).isEqualTo(45.0);
        assertThat(score.verdict()).isEqualTo(Verdict.NEEDS_WORK);
        assertThat(score.scoringVersion()).isEqualTo("deterministic-1");
        assertThat(score.categories()).hasSize(2);
        assertThat(score.categories()).anySatisfy(c -> {
            assertThat(c.categoryKey()).isEqualTo("FUNCTIONAL");
            assertThat(c.status()).isEqualTo("NOT_EVALUATED");
        });
    }

    @Test
    void reportIs409BeforeThePipelineHasGeneratedIt() {
        Evaluation evaluation = evaluation(EvaluationStatus.SCANNING);
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(reportRepository.findByEvaluationId(evaluation.getEvaluationId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.report(evaluation.getEvaluationId(), owner))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT))
                .hasMessageContaining("SCANNING");
    }

    @Test
    void reportReturnsTheRenderedReportOnceGenerated() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        ProjectSubmission submission = submission(ownerUserId, evaluation);
        EvaluationReport report = new EvaluationReport();
        report.setEvaluationId(evaluation.getEvaluationId());
        report.setReportMarkdown("# CodeJudge Evaluation Report\n");
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(reportRepository.findByEvaluationId(evaluation.getEvaluationId())).thenReturn(Optional.of(report));

        assertThat(service.report(evaluation.getEvaluationId(), owner).reportMarkdown())
                .contains("CodeJudge Evaluation Report");
    }

    @Test
    void listHidesOtherOwnersRunsFromAStudentButNotFromStaff() {
        Evaluation mine = evaluation(EvaluationStatus.COMPLETED);
        Evaluation theirs = evaluation(EvaluationStatus.COMPLETED);
        ProjectSubmission mineSubmission = submission(ownerUserId, mine);
        ProjectSubmission theirSubmission = submission(UUID.randomUUID(), theirs);
        when(evaluationRepository.findAll()).thenReturn(List.of(mine, theirs));
        when(submissionRepository.findById(mineSubmission.getSubmissionId()))
                .thenReturn(Optional.of(mineSubmission));
        when(submissionRepository.findById(theirSubmission.getSubmissionId()))
                .thenReturn(Optional.of(theirSubmission));

        assertThat(service.list(owner, null)).hasSize(1);
        assertThat(service.list(evaluator, null)).hasSize(2);
    }

    @Test
    void retryOnlyAcceptsAFailedEvaluation() {
        Evaluation running = evaluation(EvaluationStatus.SCANNING);
        when(evaluationRepository.findById(running.getEvaluationId())).thenReturn(Optional.of(running));

        assertThatThrownBy(() -> service.retry(running.getEvaluationId()))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(jobQueueService, never()).retry(any(), anyInt());
    }

    @Test
    void retryRequeuesAFailedEvaluationOnTheSameId() {
        Evaluation failed = evaluation(EvaluationStatus.FAILED);
        when(evaluationRepository.findById(failed.getEvaluationId())).thenReturn(Optional.of(failed));
        when(evaluationRepository.save(any(Evaluation.class))).thenAnswer(i -> i.getArgument(0));

        Evaluation retried = service.retry(failed.getEvaluationId());

        assertThat(retried.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
        assertThat(retried.getCompletedAt()).isNull();
        verify(jobQueueService).retry(eq(failed.getEvaluationId()), anyInt());
    }

    @Test
    void reevaluateOpensAFreshRunAndLeavesTheOldOneUntouched() {
        Evaluation previous = evaluation(EvaluationStatus.COMPLETED);
        previous.setFinalScore(45.0);
        ProjectSubmission submission = submission(ownerUserId, previous);
        when(evaluationRepository.findById(previous.getEvaluationId())).thenReturn(Optional.of(previous));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(evaluationRepository.save(any(Evaluation.class))).thenAnswer(i -> {
            Evaluation e = i.getArgument(0);
            if (e.getEvaluationId() == null) {
                e.setEvaluationId(UUID.randomUUID());
            }
            return e;
        });

        Evaluation fresh = service.reevaluate(previous.getEvaluationId());

        assertThat(fresh.getEvaluationId()).isNotEqualTo(previous.getEvaluationId());
        assertThat(fresh.getStatus()).isEqualTo(EvaluationStatus.QUEUED);
        assertThat(fresh.getSubmissionId()).isEqualTo(submission.getSubmissionId());
        // The historical run keeps its score so its report stays truthful.
        assertThat(previous.getFinalScore()).isEqualTo(45.0);
        assertThat(previous.getStatus()).isEqualTo(EvaluationStatus.COMPLETED);
    }

    @Test
    void summaryIsUnscopedBecauseTheInternalSurfaceIsTrusted() {
        Evaluation evaluation = evaluation(EvaluationStatus.COMPLETED);
        evaluation.setFinalScore(72.0);
        evaluation.setVerdict(Verdict.GOOD);
        ProjectSubmission submission = submission(UUID.randomUUID(), evaluation);
        UUID portalSubmissionId = UUID.randomUUID();
        submission.setPortalSubmissionId(portalSubmissionId);
        when(evaluationRepository.findById(evaluation.getEvaluationId())).thenReturn(Optional.of(evaluation));
        when(submissionRepository.findById(submission.getSubmissionId())).thenReturn(Optional.of(submission));
        when(categoryScoreRepository.findByEvaluationIdOrderByCategoryKeyAsc(evaluation.getEvaluationId()))
                .thenReturn(List.of(categoryScore("ENGINEERING", 15, "EVALUATED")));
        when(findingRepository.findByEvaluationIdOrderBySeverityDescCreatedAtAsc(evaluation.getEvaluationId()))
                .thenReturn(List.of());

        EvaluationSummaryResponse summary = service.summary(evaluation.getEvaluationId());

        assertThat(summary.portalSubmissionId()).isEqualTo(portalSubmissionId);
        assertThat(summary.finalScore()).isEqualTo(72.0);
        assertThat(summary.verdict()).isEqualTo(Verdict.GOOD);
        assertThat(summary.categories()).hasSize(1);
    }

    // -- fixtures -----------------------------------------------------------

    private void stubSaves() {
        when(submissionRepository.save(any(ProjectSubmission.class))).thenAnswer(i -> {
            ProjectSubmission s = i.getArgument(0);
            if (s.getSubmissionId() == null) {
                s.setSubmissionId(UUID.randomUUID());
            }
            return s;
        });
        when(evaluationRepository.save(any(Evaluation.class))).thenAnswer(i -> {
            Evaluation e = i.getArgument(0);
            if (e.getEvaluationId() == null) {
                e.setEvaluationId(UUID.randomUUID());
            }
            return e;
        });
    }

    private ProjectSubmission captureSubmission() {
        var captor = org.mockito.ArgumentCaptor.forClass(ProjectSubmission.class);
        verify(submissionRepository).save(captor.capture());
        return captor.getValue();
    }

    private EvaluationCreateRequest request(String repositoryUrl, String commitSha) {
        return new EvaluationCreateRequest(null, problemId, "Water logging in ward 4",
                null, repositoryUrl, "main", commitSha, null, null);
    }

    /** The same payload as the portal's hand-off: a portal submission id is present. */
    private EvaluationCreateRequest portalRequest(UUID portalSubmissionId, String commitSha) {
        return new EvaluationCreateRequest(portalSubmissionId, problemId, "Water logging in ward 4",
                null, "https://github.com/team/project", "main", commitSha, null, null);
    }

    private ProblemContextResponse problemContext() {
        return new ProblemContextResponse(problemId, "PUBLISHED", "Ward 4 storm-water logging",
                "Storm drains overflow every monsoon.", "CIVIC_INFRASTRUCTURE", "WARD",
                "HIGH", "SEVERE", 12000, "Dry wards through the monsoon.",
                "Existing pumping station", "Ward 4, Pune",
                List.of("CIVIC_INFRASTRUCTURE", "WATER"), 3, "OPEN_TO_ALL", List.of());
    }

    private Evaluation evaluation(EvaluationStatus status) {
        Evaluation e = new Evaluation();
        e.setEvaluationId(UUID.randomUUID());
        e.setSubmissionId(UUID.randomUUID());
        e.setStatus(status);
        return e;
    }

    /** A submission owned by {@code owner}, wired to {@code evaluation} so the repo stubs line up. */
    private ProjectSubmission submission(UUID owner, Evaluation evaluation) {
        ProjectSubmission s = new ProjectSubmission();
        s.setSubmissionId(UUID.randomUUID());
        s.setOwnerUserId(owner);
        s.setProblemId(problemId);
        s.setRepositoryUrl("https://github.com/team/project");
        s.setBranch("main");
        s.setCommitSha("abc1234");
        evaluation.setSubmissionId(s.getSubmissionId());
        return s;
    }

    private EvaluationCategoryScore categoryScore(String key, double score, String status) {
        EvaluationCategoryScore row = new EvaluationCategoryScore();
        row.setCategoryKey(key);
        row.setScore(score);
        row.setMaxScore(15.0);
        row.setWeight(15.0);
        row.setStatus(status);
        return row;
    }
}
