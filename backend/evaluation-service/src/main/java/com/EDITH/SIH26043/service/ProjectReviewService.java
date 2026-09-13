package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.PortalGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.entity.ProjectReview;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ProjectReviewStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ProjectReviewRepository;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateRequest;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateResponse;
import com.EDITH.SIH26043.web.dto.ProjectReviewDetailView;
import com.EDITH.SIH26043.web.dto.ProjectReviewListItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Project reviews: portal project submissions, opened in the evaluator queue and
 * decided by the same human evaluator who scored the problem's cycle — or, when
 * that cycle was scored entirely by the AI (every pool on AUTO), by the
 * least-loaded human evaluator, so a submission is never parked on a system AI
 * profile that nobody can log in as. AI-scored project reviews are out of scope.
 *
 * <p>Create is an internal intake (portal → eval). List/detail/decide are scoped
 * to the caller's {@link EvaluatorProfile}, mirroring the ownership guard of
 * {@link EvaluatorAssignmentService}: a {@code projectReviewId} in the path is
 * authorized against the profile, never trusted on its own. A decision is
 * persisted here and then pushed best-effort back to portal so the submission
 * lands on {@code ACCEPTED} / {@code RETURNED}.</p>
 */
@Service
public class ProjectReviewService {

    private static final Logger log = LoggerFactory.getLogger(ProjectReviewService.class);

    private static final EnumSet<EvaluationStatus> REVIEWABLE_CYCLE_STATUSES = EnumSet.of(
            EvaluationStatus.EVALUATION_COMPLETED,
            EvaluationStatus.SCORES_AGGREGATED,
            EvaluationStatus.PRIORITIZED,
            EvaluationStatus.PHASE_3_READY);

    /** Assignment statuses that count toward an evaluator's open workload. */
    private static final List<AssignmentStatus> OPEN_STATUSES =
            List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS);

    private final ProjectReviewRepository reviewRepository;
    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final AuditService auditService;
    private final PortalGateway portalGateway;

    public ProjectReviewService(ProjectReviewRepository reviewRepository,
                                EvaluationCycleRepository cycleRepository,
                                EvaluationAssignmentRepository assignmentRepository,
                                EvaluatorProfileRepository profileRepository,
                                AuditService auditService,
                                PortalGateway portalGateway) {
        this.reviewRepository = reviewRepository;
        this.cycleRepository = cycleRepository;
        this.assignmentRepository = assignmentRepository;
        this.profileRepository = profileRepository;
        this.auditService = auditService;
        this.portalGateway = portalGateway;
    }

    // ------------------------------------------------------------------ create

    /**
     * Opens (or returns the existing) review for a portal submission. The reviewer is
     * resolved from the problem's SUBMITTED evaluation assignments — the human evaluator
     * who scored it, or the least-loaded human when the cycle was scored entirely by the
     * AI. Idempotent on {@code (submissionId, round)}.
     *
     * @throws ApiException 409 {@code PROBLEM_NOT_EVALUATED} when the cycle is not
     *                      complete enough to have produced a reviewer.
     */
    @Transactional
    public ProjectReviewCreateResponse createInternal(ProjectReviewCreateRequest req) {
        int round = req.round() == null ? 1 : req.round();
        EvaluationCycle cycle = cycleRepository.findByProblemId(req.problemId())
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "PROBLEM_NOT_EVALUATED — no evaluation cycle for problem " + req.problemId()));
        if (!REVIEWABLE_CYCLE_STATUSES.contains(cycle.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "PROBLEM_NOT_EVALUATED — cycle " + cycle.getCycleId() + " is "
                            + cycle.getStatus() + "; projects can only be reviewed once a problem is evaluated");
        }

        ProjectReview existing = reviewRepository
                .findBySubmissionIdAndRound(req.submissionId(), round).orElse(null);
        if (existing != null) {
            return toCreateResponse(existing); // duplicate push / retry
        }

        List<EvaluationAssignment> submitted = assignmentRepository
                .findByCycleIdAndStatusIn(cycle.getCycleId(),
                        List.of(AssignmentStatus.SUBMITTED));
        if (submitted.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "PROBLEM_NOT_EVALUATED — no submitted evaluation assignment for cycle "
                            + cycle.getCycleId());
        }
        EvaluatorProfile reviewer = resolveReviewer(cycle, submitted);

        ProjectReview review = new ProjectReview();
        review.setSubmissionId(req.submissionId());
        review.setRound(round);
        review.setProblemId(req.problemId());
        review.setCycleId(cycle.getCycleId());
        review.setEvaluatorProfileId(reviewer.getProfileId());
        review.setReviewerUserId(reviewer.getUserId());
        review.setProblemTitle(req.problemTitle());
        review.setSubmissionTitle(req.submissionTitle());
        review.setSummary(req.summary());
        review.setGithubUrl(req.githubUrl());
        review.setLinks(req.links() == null ? List.of() : req.links());
        review.setFiles(req.files() == null ? List.of() : toFileSnapshots(req.files()));
        reviewRepository.save(review);

        Map<String, Object> after = new HashMap<>();
        after.put("projectReviewId", review.getProjectReviewId());
        after.put("submissionId", review.getSubmissionId());
        after.put("round", review.getRound());
        after.put("evaluatorProfileId", reviewer.getProfileId());
        after.put("reviewerUserId", reviewer.getUserId());
        after.put("status", review.getStatus().name());
        auditService.record("PROBLEM", req.problemId(), AuditAction.PROJECT_REVIEW_ASSIGNED,
                reviewer.getUserId(), null, after, "internal");

        return toCreateResponse(review);
    }

    /**
     * Who takes the project review — always a human.
     *
     * <p>Preference order: (1) the first submitted assignment of the cycle whose profile is
     * <em>not</em> a system AI profile, i.e. the evaluator who actually scored the problem;
     * (2) when every submitted assignment is AI-owned — a fully-AUTO cycle — the
     * least-loaded active human evaluator of any pool; (3) otherwise a 409 naming the real
     * cause.</p>
     *
     * <p>Step 1 exists because AI scoring is now a first-class way for a cycle to complete:
     * a review parked on a system profile would never be opened, since nobody can log in as
     * the AI. Step 2 deliberately does <em>not</em> apply routing's {@code max_workload}
     * ceiling — an evaluator carrying one project over capacity is a far better outcome than
     * a submission sitting in {@code UNDER_REVIEW} forever, which is exactly what a capacity
     * check would produce when every evaluator is full.</p>
     */
    private EvaluatorProfile resolveReviewer(EvaluationCycle cycle,
                                             List<EvaluationAssignment> submitted) {
        for (EvaluationAssignment assignment : submitted) {
            EvaluatorProfile profile = profileRepository
                    .findById(assignment.getEvaluatorProfileId()).orElse(null);
            if (profile != null && !profile.isSystem()) {
                return profile;
            }
        }

        EvaluatorProfile human = leastLoadedHuman();
        if (human != null) {
            log.info("Every submitted assignment of cycle {} is AI-owned; project review falls back "
                    + "to human evaluator {}", cycle.getCycleId(), human.getProfileId());
            return human;
        }
        throw new ApiException(HttpStatus.CONFLICT,
                "PROBLEM_NOT_EVALUATED — cycle " + cycle.getCycleId() + " was scored by the AI and no "
                        + "human evaluator exists to review projects"
                        + " (onboard one via POST /evaluation/evaluator-profiles)");
    }

    /** Lowest open-load active human across all pools; null when the deployment has none. */
    private EvaluatorProfile leastLoadedHuman() {
        EvaluatorProfile chosen = null;
        long chosenLoad = 0;
        for (EvaluatorProfile candidate : profileRepository.findByActiveIsTrue()) {
            if (candidate.isSystem()) {
                continue;
            }
            long openLoad = assignmentRepository.countByEvaluatorProfileIdAndStatusIn(
                    candidate.getProfileId(), OPEN_STATUSES);
            if (chosen == null || openLoad < chosenLoad) {
                chosen = candidate;
                chosenLoad = openLoad;
            }
        }
        return chosen;
    }

    // ------------------------------------------------------------------- reads

    /** The caller's project-review queue, newest first, optionally filtered by status. */
    @Transactional(readOnly = true)
    public List<ProjectReviewListItem> myReviews(UUID userId, ProjectReviewStatus status) {
        EvaluatorProfile profile = myProfile(userId);
        List<ProjectReview> reviews = reviewRepository
                .findByEvaluatorProfileIdOrderByCreatedAtDesc(profile.getProfileId());
        if (status != null) {
            reviews = reviews.stream().filter(r -> r.getStatus() == status).toList();
        }
        return reviews.stream().map(this::toListItem).toList();
    }

    /** Full review for the caller (403 for someone else's). */
    @Transactional(readOnly = true)
    public ProjectReviewDetailView detail(UUID userId, UUID projectReviewId) {
        return toDetailView(requireOwn(userId, projectReviewId));
    }

    // ------------------------------------------------------------------ decide

    /**
     * ASSIGNED → ACCEPTED | RETURNED by the owning evaluator. The decision is
     * persisted + audited here, then pushed best-effort to portal-service so the
     * submission advances to the same terminal state. A portal outage never rolls
     * back the decision — the push is retried via the portal's idempotent intake.
     */
    @Transactional
    public ProjectReviewDetailView decide(UUID userId, UUID projectReviewId,
                                          String decision, String comment) {
        ProjectReview review = requireOwn(userId, projectReviewId);
        if (review.getStatus() != ProjectReviewStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Project review is " + review.getStatus() + "; only an ASSIGNED one can be decided");
        }
        ProjectReviewStatus target;
        try {
            String raw = decision == null ? "" : decision.trim().toUpperCase();
            target = ProjectReviewStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "decision must be ACCEPTED or RETURNED");
        }
        if (target == ProjectReviewStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "decision must be ACCEPTED or RETURNED");
        }

        review.setStatus(target);
        review.setDecisionComment(comment);
        review.setDecidedAt(Instant.now());
        reviewRepository.save(review);

        Map<String, Object> after = new HashMap<>();
        after.put("projectReviewId", review.getProjectReviewId());
        after.put("submissionId", review.getSubmissionId());
        after.put("round", review.getRound());
        after.put("status", target.name());
        after.put("decisionComment", comment);
        auditService.record("PROBLEM", review.getProblemId(), AuditAction.PROJECT_REVIEW_DECIDED,
                userId, Map.of("status", ProjectReviewStatus.ASSIGNED.name()), after, "internal");

        try {
            portalGateway.notifyReviewResult(review.getSubmissionId(), target.name(), comment);
        } catch (ApiException e) {
            log.warn("Project review {} decided {} but portal was not notified: {}",
                    projectReviewId, target, e.getMessage());
        }
        return toDetailView(review);
    }

    // ------------------------------------------------------------------ helpers

    private EvaluatorProfile myProfile(UUID userId) {
        List<EvaluatorProfile> profiles = profileRepository.findByUserId(userId);
        if (profiles.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    "No evaluator profile for user " + userId
                            + "; an ADMIN must onboard you via POST /evaluation/evaluator-profiles");
        }
        return profiles.getFirst();
    }

    private ProjectReview requireOwn(UUID userId, UUID projectReviewId) {
        ProjectReview review = reviewRepository.findById(projectReviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Project review " + projectReviewId + " not found"));
        if (!myProfile(userId).getProfileId().equals(review.getEvaluatorProfileId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Project review " + projectReviewId + " belongs to another evaluator");
        }
        return review;
    }

    private List<Map<String, Object>> toFileSnapshots(
            List<ProjectReviewCreateRequest.ProjectFileMeta> files) {
        return files.stream().map(f -> {
            Map<String, Object> m = new HashMap<>();
            m.put("fileId", f.fileId());
            m.put("fileName", f.fileName());
            m.put("sizeBytes", f.sizeBytes());
            m.put("contentType", f.contentType());
            return m;
        }).toList();
    }

    private ProjectReviewCreateResponse toCreateResponse(ProjectReview review) {
        return new ProjectReviewCreateResponse(
                review.getProjectReviewId(),
                review.getReviewerUserId(),
                review.getEvaluatorProfileId(),
                review.getStatus().name());
    }

    private ProjectReviewListItem toListItem(ProjectReview r) {
        return new ProjectReviewListItem(
                r.getProjectReviewId(),
                r.getProblemId(),
                r.getProblemTitle(),
                r.getSubmissionTitle(),
                r.getRound(),
                r.getStatus().name(),
                r.getCreatedAt(),
                r.getDecidedAt());
    }

    private ProjectReviewDetailView toDetailView(ProjectReview r) {
        return new ProjectReviewDetailView(
                r.getProjectReviewId(),
                r.getSubmissionId(),
                r.getProblemId(),
                r.getCycleId(),
                r.getProblemTitle(),
                r.getSubmissionTitle(),
                r.getSummary(),
                r.getGithubUrl(),
                r.getLinks() == null ? List.of() : r.getLinks(),
                r.getRound(),
                r.getStatus().name(),
                r.getDecisionComment(),
                toFileViews(r.getFiles()),
                r.getCreatedAt(),
                r.getDecidedAt());
    }

    private List<ProjectReviewDetailView.ProjectReviewFile> toFileViews(
            List<Map<String, Object>> files) {
        if (files == null) {
            return List.of();
        }
        return files.stream().map(f -> {
            UUID fileId = asUuid(f.get("fileId"));
            return new ProjectReviewDetailView.ProjectReviewFile(
                    fileId,
                    f.get("fileName") == null ? null : String.valueOf(f.get("fileName")),
                    asLong(f.get("sizeBytes")),
                    f.get("contentType") == null ? null : String.valueOf(f.get("contentType")),
                    fileId == null ? null : "/portal/files/" + fileId + "/download");
        }).toList();
    }

    private static UUID asUuid(Object value) {
        if (value instanceof UUID u) {
            return u;
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return UUID.fromString(s);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    private static Long asLong(Object value) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
