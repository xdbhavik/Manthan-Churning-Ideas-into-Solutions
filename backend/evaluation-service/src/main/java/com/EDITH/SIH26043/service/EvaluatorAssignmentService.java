package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationResponse;
import com.EDITH.SIH26043.entity.EvaluationResponseId;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationResponseRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.web.dto.AssignmentDetailResponse;
import com.EDITH.SIH26043.web.dto.AssignmentOutcomeResponse;
import com.EDITH.SIH26043.web.dto.CriterionScoreResponse;
import com.EDITH.SIH26043.web.dto.MyAssignmentResponse;
import com.EDITH.SIH26043.web.dto.ProblemAnalysisResponse;
import com.EDITH.SIH26043.web.dto.ScoreSubmissionRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The evaluator's own side of the pipeline: see my work queue, open a problem,
 * accept or decline it, and submit a scorecard.
 *
 * <p>Every method is scoped to the caller's {@link EvaluatorProfile} (resolved
 * from the JWT subject), so an evaluator can only ever read or write their own
 * assignments — the {@code assignmentId} in the path is authorized against the
 * profile, never trusted on its own.</p>
 *
 * <p>Scorecards are all-or-nothing: a submission must cover every active
 * criterion of the evaluator's pool exactly once, so aggregation never averages
 * a half-filled form. Deadlines are enforced lazily on write (there is no
 * scheduler): accepting or submitting past the deadline marks the assignment
 * EXPIRED instead of silently accepting late work.</p>
 */
@Service
public class EvaluatorAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(EvaluatorAssignmentService.class);

    /** Assignment statuses an evaluator can still act on. */
    private static final List<AssignmentStatus> OPEN_STATUSES =
            List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS);

    private final EvaluatorProfileRepository profileRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluationResponseRepository responseRepository;
    private final EvaluationCriterionRepository criterionRepository;
    private final EvaluationCycleRepository cycleRepository;
    private final ProblemAnalysisRepository analysisRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;
    private final ProblemContextGateway problemGateway;

    public EvaluatorAssignmentService(EvaluatorProfileRepository profileRepository,
                                      EvaluationAssignmentRepository assignmentRepository,
                                      EvaluationResponseRepository responseRepository,
                                      EvaluationCriterionRepository criterionRepository,
                                      EvaluationCycleRepository cycleRepository,
                                      ProblemAnalysisRepository analysisRepository,
                                      EvaluationStatusService statusService,
                                      AuditService auditService,
                                      ProblemContextGateway problemGateway) {
        this.profileRepository = profileRepository;
        this.assignmentRepository = assignmentRepository;
        this.responseRepository = responseRepository;
        this.criterionRepository = criterionRepository;
        this.cycleRepository = cycleRepository;
        this.analysisRepository = analysisRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.problemGateway = problemGateway;
    }

    /**
     * The caller's evaluator profile. A user with the EVALUATOR role but no
     * profile cannot be routed anything, so this is a 404 with the fix in the
     * message rather than a silent empty queue.
     */
    @Transactional(readOnly = true)
    public EvaluatorProfile myProfile(UUID userId) {
        List<EvaluatorProfile> profiles = profileRepository.findByUserId(userId);
        if (profiles.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    "No evaluator profile for user " + userId
                            + "; an ADMIN must onboard you via POST /evaluation/evaluator-profiles");
        }
        // user_id is UNIQUE, so this list holds at most one row.
        return profiles.getFirst();
    }

    /** Active criteria of the caller's pool, in display order. */
    @Transactional(readOnly = true)
    public List<CriterionScoreResponse> myCriteria(UUID userId) {
        return activeCriteria(myProfile(userId)).stream()
                .map(c -> CriterionScoreResponse.of(c, null))
                .toList();
    }

    /** The caller's work queue, earliest deadline first, optionally filtered by status. */
    @Transactional(readOnly = true)
    public List<MyAssignmentResponse> myAssignments(UUID userId, AssignmentStatus status) {
        EvaluatorProfile profile = myProfile(userId);
        List<EvaluationAssignment> assignments =
                assignmentRepository.findByEvaluatorProfileIdOrderByDeadlineAsc(profile.getProfileId());
        if (status != null) {
            assignments = assignments.stream().filter(a -> a.getStatus() == status).toList();
        }
        if (assignments.isEmpty()) {
            return List.of();
        }

        int criteriaTotal = activeCriteria(profile).size();
        // One batched cycle read instead of one per row.
        Map<UUID, EvaluationCycle> cycles = cycleRepository
                .findAllById(assignments.stream().map(EvaluationAssignment::getCycleId).toList())
                .stream()
                .collect(Collectors.toMap(EvaluationCycle::getCycleId, Function.identity()));

        return assignments.stream()
                .map(a -> toListItem(a, cycles.get(a.getCycleId()), criteriaTotal))
                .toList();
    }

    /**
     * Full scoring context for one of the caller's assignments. The problem body
     * comes from problem-service; when that call fails the criteria form is still
     * returned (with {@code problem = null}) so a network blip does not block the
     * evaluator entirely.
     */
    @Transactional(readOnly = true)
    public AssignmentDetailResponse assignmentDetail(UUID userId, UUID assignmentId) {
        EvaluatorProfile profile = myProfile(userId);
        EvaluationAssignment assignment = requireOwnAssignment(profile, assignmentId);
        EvaluationCycle cycle = requireCycle(assignment.getCycleId());

        ProblemContextResponse problem = null;
        try {
            problem = problemGateway.fetch(cycle.getProblemId());
        } catch (ApiException e) {
            log.warn("Problem context unavailable for assignment {} (problem {}): {}",
                    assignmentId, cycle.getProblemId(), e.getMessage());
        }

        ProblemAnalysisResponse analysis = analysisRepository.findByCycleId(cycle.getCycleId())
                .map(ProblemAnalysisResponse::from)
                .orElse(null);

        List<CriterionScoreResponse> criteria = criteriaWithMyScores(profile, assignmentId);
        int scored = (int) criteria.stream().filter(c -> c.myScore() != null).count();

        return new AssignmentDetailResponse(
                toListItem(assignment, cycle, criteria.size()).withCriteriaScored(scored),
                assignment.getFeedback(), assignment.getRecommendation(),
                problem, analysis, criteria);
    }

    /** ASSIGNED → IN_PROGRESS. Re-accepting an already accepted assignment is a no-op. */
    @Transactional
    public AssignmentOutcomeResponse accept(UUID userId, UUID assignmentId, String ipAddress) {
        EvaluatorProfile profile = myProfile(userId);
        EvaluationAssignment assignment = requireOwnAssignment(profile, assignmentId);

        if (assignment.getStatus() == AssignmentStatus.IN_PROGRESS) {
            return outcome(assignment, "Already accepted; assignment is IN_PROGRESS");
        }
        requireStatus(assignment, AssignmentStatus.ASSIGNED, "accepted");
        requireNotExpired(assignment);

        assignment.setStatus(AssignmentStatus.IN_PROGRESS);
        assignmentRepository.save(assignment);
        audit(assignment, AuditAction.STATUS_CHANGED, userId, AssignmentStatus.ASSIGNED, ipAddress);

        return outcome(assignment, "Accepted; submit the scorecard before " + assignment.getDeadline());
    }

    /**
     * ASSIGNED/IN_PROGRESS → DECLINED. When this leaves the cycle with no open
     * assignment, the cycle goes back to ROUTING so an ADMIN can re-route it to
     * another evaluator (POST /evaluation/cycles/{cycleId}/route).
     */
    @Transactional
    public AssignmentOutcomeResponse decline(UUID userId, UUID assignmentId, String reason,
                                             String ipAddress) {
        EvaluatorProfile profile = myProfile(userId);
        EvaluationAssignment assignment = requireOwnAssignment(profile, assignmentId);
        AssignmentStatus before = assignment.getStatus();
        if (!OPEN_STATUSES.contains(before)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Assignment is " + before + "; only an ASSIGNED or IN_PROGRESS one can be declined");
        }

        assignment.setStatus(AssignmentStatus.DECLINED);
        if (reason != null && !reason.isBlank()) {
            assignment.setFeedback("Declined: " + reason.trim());
        }
        assignmentRepository.save(assignment);
        audit(assignment, AuditAction.STATUS_CHANGED, userId, before, ipAddress);

        String message = "Declined";
        if (reopenForRouting(assignment, userId)) {
            message = "Declined; cycle reopened for routing";
        }
        return outcome(assignment, message);
    }

    /**
     * Stores the full scorecard and closes the assignment (SUBMITTED). When it was
     * the cycle's last open assignment the cycle advances to EVALUATION_COMPLETED,
     * ready for aggregation.
     */
    @Transactional
    public AssignmentOutcomeResponse submit(UUID userId, UUID assignmentId,
                                            ScoreSubmissionRequest req, String ipAddress) {
        EvaluatorProfile profile = myProfile(userId);
        EvaluationAssignment assignment = requireOwnAssignment(profile, assignmentId);
        AssignmentStatus before = assignment.getStatus();
        if (before == AssignmentStatus.SUBMITTED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Scorecard already submitted at " + assignment.getSubmittedAt());
        }
        if (!OPEN_STATUSES.contains(before)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Assignment is " + before + "; only an ASSIGNED or IN_PROGRESS one can be scored");
        }
        requireNotExpired(assignment);

        List<EvaluationResponse> rows = validateScorecard(profile, assignmentId, req);
        responseRepository.saveAll(rows);

        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignment.setSubmittedAt(Instant.now());
        assignment.setFeedback(req.feedback());
        assignment.setRecommendation(req.recommendation());
        // The conflict-of-interest question was (re)asked at submit time.
        assignment.setConflictRecheck(true);
        assignment.setEligibilityRecheckedAt(Instant.now());
        assignmentRepository.save(assignment);

        auditService.record("PROBLEM", problemIdOf(assignment), AuditAction.EVALUATION_SUBMITTED,
                userId, Map.of("status", before.name()),
                submitSnapshot(assignment, profile, rows.size()), ipAddress);

        String message = "Scorecard submitted (" + rows.size() + " criteria)";
        if (completeCycleIfNoOpenAssignments(assignment, userId, ipAddress)) {
            message += "; cycle EVALUATION_COMPLETED";
        }
        return new AssignmentOutcomeResponse(assignment.getAssignmentId(), assignment.getStatus(),
                assignment.getSubmittedAt(), rows.size(), cycleStatusOf(assignment), message);
    }

    // ------------------------------------------------------------------
    // scorecard validation
    // ------------------------------------------------------------------

    /**
     * Turns the request into persistable rows, rejecting anything that would make
     * the scorecard un-aggregatable: an unknown criterion, a duplicate, a score
     * above the criterion's own {@code maxScore}, or a missing criterion.
     */
    private List<EvaluationResponse> validateScorecard(EvaluatorProfile profile, UUID assignmentId,
                                                       ScoreSubmissionRequest req) {
        List<EvaluationCriterion> criteria = activeCriteria(profile);
        if (criteria.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "No active criteria configured for pool " + profile.getEvaluatorType()
                            + "; cannot score");
        }
        Map<UUID, EvaluationCriterion> byId = new LinkedHashMap<>();
        Map<String, EvaluationCriterion> byKey = new LinkedHashMap<>();
        criteria.forEach(c -> {
            byId.put(c.getCriterionId(), c);
            byKey.put(c.getCriterionKey(), c);
        });

        List<EvaluationResponse> rows = new ArrayList<>();
        Set<UUID> seen = new LinkedHashSet<>();
        for (ScoreSubmissionRequest.CriterionScore score : req.scores()) {
            EvaluationCriterion criterion = resolveCriterion(score, byId, byKey, profile);
            if (!seen.add(criterion.getCriterionId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Criterion '" + criterion.getCriterionKey() + "' scored more than once");
            }
            int max = criterion.getMaxScore() == null ? 10 : criterion.getMaxScore();
            if (score.score() > max) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Score " + score.score() + " exceeds maxScore " + max
                                + " for criterion '" + criterion.getCriterionKey() + "'");
            }

            EvaluationResponse row = new EvaluationResponse();
            row.setId(new EvaluationResponseId(assignmentId, criterion.getCriterionId()));
            row.setScore(score.score());
            row.setComment(score.comment());
            rows.add(row);
        }

        List<String> missing = criteria.stream()
                .filter(c -> !seen.contains(c.getCriterionId()))
                .map(EvaluationCriterion::getCriterionKey)
                .toList();
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Scorecard is incomplete — every criterion must be scored. Missing: "
                            + String.join(", ", missing));
        }
        return rows;
    }

    private EvaluationCriterion resolveCriterion(ScoreSubmissionRequest.CriterionScore score,
                                                 Map<UUID, EvaluationCriterion> byId,
                                                 Map<String, EvaluationCriterion> byKey,
                                                 EvaluatorProfile profile) {
        EvaluationCriterion criterion = null;
        if (score.criterionId() != null) {
            criterion = byId.get(score.criterionId());
        } else if (score.criterionKey() != null && !score.criterionKey().isBlank()) {
            criterion = byKey.get(score.criterionKey().trim());
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Each score needs a criterionId or a criterionKey");
        }
        if (criterion == null) {
            String given = score.criterionId() != null
                    ? String.valueOf(score.criterionId()) : score.criterionKey();
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Criterion '" + given + "' is not an active criterion of pool "
                            + profile.getEvaluatorType() + "; expected one of " + byKey.keySet());
        }
        return criterion;
    }

    // ------------------------------------------------------------------
    // cycle knock-on transitions
    // ------------------------------------------------------------------

    /** @return true when the cycle was advanced to EVALUATION_COMPLETED. */
    private boolean completeCycleIfNoOpenAssignments(EvaluationAssignment assignment, UUID userId,
                                                     String ipAddress) {
        EvaluationCycle cycle = requireCycle(assignment.getCycleId());
        if (cycle.getStatus() != EvaluationStatus.EVALUATION_IN_PROGRESS || hasOpenAssignments(cycle)) {
            return false;
        }
        statusService.transition(cycle.getCycleId(), EvaluationStatus.EVALUATION_COMPLETED,
                userId, "All assignments submitted");
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_COMPLETED,
                userId, null, Map.of("cycleId", cycle.getCycleId()), ipAddress);
        return true;
    }

    /**
     * A declined assignment leaves the problem unevaluated, so the cycle goes back
     * to ROUTING for another attempt. Only when nothing else is still open — a
     * multi-evaluator cycle keeps running on the remaining assignments.
     *
     * @return true when the cycle was moved back to ROUTING
     */
    private boolean reopenForRouting(EvaluationAssignment assignment, UUID userId) {
        EvaluationCycle cycle = requireCycle(assignment.getCycleId());
        if (cycle.getStatus() != EvaluationStatus.EVALUATION_IN_PROGRESS || hasOpenAssignments(cycle)) {
            return false;
        }
        statusService.transition(cycle.getCycleId(), EvaluationStatus.ROUTING, userId,
                "Assignment declined; reopened for routing");
        return true;
    }

    private boolean hasOpenAssignments(EvaluationCycle cycle) {
        return !assignmentRepository
                .findByCycleIdAndStatusIn(cycle.getCycleId(), OPEN_STATUSES).isEmpty();
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private List<EvaluationCriterion> activeCriteria(EvaluatorProfile profile) {
        return criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(
                profile.getEvaluatorType());
    }

    private List<CriterionScoreResponse> criteriaWithMyScores(EvaluatorProfile profile,
                                                              UUID assignmentId) {
        Map<UUID, EvaluationResponse> mine = new HashMap<>();
        responseRepository.findById_AssignmentId(assignmentId)
                .forEach(r -> mine.put(r.getId().getCriterionId(), r));
        return activeCriteria(profile).stream()
                .map(c -> CriterionScoreResponse.of(c, mine.get(c.getCriterionId())))
                .toList();
    }

    /** 403 (not 404) for someone else's assignment: the row exists, it is just not yours. */
    private EvaluationAssignment requireOwnAssignment(EvaluatorProfile profile, UUID assignmentId) {
        EvaluationAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Assignment " + assignmentId + " not found"));
        if (!profile.getProfileId().equals(assignment.getEvaluatorProfileId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Assignment " + assignmentId + " belongs to another evaluator");
        }
        return assignment;
    }

    private EvaluationCycle requireCycle(UUID cycleId) {
        return cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));
    }

    private void requireStatus(EvaluationAssignment assignment, AssignmentStatus expected,
                               String verb) {
        if (assignment.getStatus() != expected) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Assignment is " + assignment.getStatus() + "; only an " + expected
                            + " one can be " + verb);
        }
    }

    /**
     * Lazy deadline enforcement (no scheduler): the first write attempt after the
     * deadline flips the assignment to EXPIRED and fails, so late work is never
     * silently accepted.
     */
    private void requireNotExpired(EvaluationAssignment assignment) {
        if (assignment.getDeadline() != null && assignment.getDeadline().isBefore(Instant.now())) {
            assignment.setStatus(AssignmentStatus.EXPIRED);
            assignmentRepository.save(assignment);
            throw new ApiException(HttpStatus.CONFLICT,
                    "Deadline passed at " + assignment.getDeadline()
                            + "; assignment marked EXPIRED — ask an ADMIN to re-route the cycle");
        }
    }

    private MyAssignmentResponse toListItem(EvaluationAssignment a, EvaluationCycle cycle,
                                            int criteriaTotal) {
        boolean overdue = a.getDeadline() != null
                && OPEN_STATUSES.contains(a.getStatus())
                && a.getDeadline().isBefore(Instant.now());
        return new MyAssignmentResponse(
                a.getAssignmentId(), a.getCycleId(),
                cycle == null ? null : cycle.getProblemId(),
                a.getStatus(), a.getAssignedAt(), a.getDeadline(), a.getSubmittedAt(),
                overdue, criteriaTotal,
                (int) responseRepository.countById_AssignmentId(a.getAssignmentId()),
                cycle == null ? null : cycle.getStatus());
    }

    private AssignmentOutcomeResponse outcome(EvaluationAssignment assignment, String message) {
        return new AssignmentOutcomeResponse(assignment.getAssignmentId(), assignment.getStatus(),
                assignment.getSubmittedAt(),
                (int) responseRepository.countById_AssignmentId(assignment.getAssignmentId()),
                cycleStatusOf(assignment), message);
    }

    private EvaluationStatus cycleStatusOf(EvaluationAssignment assignment) {
        return cycleRepository.findById(assignment.getCycleId())
                .map(EvaluationCycle::getStatus)
                .orElse(null);
    }

    private UUID problemIdOf(EvaluationAssignment assignment) {
        return requireCycle(assignment.getCycleId()).getProblemId();
    }

    private void audit(EvaluationAssignment assignment, AuditAction action, UUID userId,
                       AssignmentStatus before, String ipAddress) {
        Map<String, Object> after = new HashMap<>();
        after.put("assignmentId", assignment.getAssignmentId());
        after.put("status", assignment.getStatus().name());
        after.put("cycleId", assignment.getCycleId());
        auditService.record("PROBLEM", problemIdOf(assignment), action, userId,
                Map.of("status", before.name()), after, ipAddress);
    }

    private Map<String, Object> submitSnapshot(EvaluationAssignment assignment,
                                               EvaluatorProfile profile, int criteriaScored) {
        // HashMap (not Map.of): submittedAt/recommendation may legitimately be null.
        Map<String, Object> snap = new HashMap<>();
        snap.put("assignmentId", assignment.getAssignmentId());
        snap.put("cycleId", assignment.getCycleId());
        snap.put("evaluatorProfileId", profile.getProfileId());
        snap.put("evaluatorType", profile.getEvaluatorType().name());
        snap.put("status", assignment.getStatus().name());
        snap.put("submittedAt", assignment.getSubmittedAt());
        snap.put("criteriaScored", criteriaScored);
        snap.put("recommendation", assignment.getRecommendation());
        return snap;
    }

    /** Optional-friendly lookup used by tests/callers that tolerate a missing profile. */
    @Transactional(readOnly = true)
    public Optional<EvaluatorProfile> findProfile(UUID userId) {
        return profileRepository.findByUserId(userId).stream().findFirst();
    }
}
