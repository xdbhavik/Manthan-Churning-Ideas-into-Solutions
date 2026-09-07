package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 2 routing step: hands a problem to the least-loaded active evaluator of
 * the pool that matches the problem's origin bucket.
 *
 * <p>The product owner's rule is bucket-based — a government department problem
 * goes to a {@code GOVERNMENT} evaluator, an industry problem to an
 * {@code INDUSTRY} evaluator, and so on. {@code source_bucket} is denormalized
 * onto the problem in problem-service and already travels on the internal
 * problem snapshot, so routing needs no new cross-service call.</p>
 *
 * <p>Exactly one assignment is created ({@code status=ASSIGNED}), the cycle moves
 * {@code ROUTING → EVALUATION_IN_PROGRESS}, and an {@code EVALUATION_ROUTED}
 * audit row records the handoff. When no active profile of the matching pool is
 * under its {@code max_workload}, the cycle stays {@code ROUTING} and the caller
 * may retry later — a {@code routed=false} outcome, never an error.</p>
 *
 * <p>Routing the same cycle again (after a decline sent it back to {@code ROUTING})
 * skips every profile that already holds an assignment for it, so the problem
 * moves to a genuinely different evaluator.</p>
 */
@Service
public class EvaluationRoutingService {

    /** Bucket of origin → evaluator pool that scores it. */
    static final Map<SourceBucket, EvaluatorType> BUCKET_TO_POOL = new EnumMap<>(Map.of(
            SourceBucket.GOVT, EvaluatorType.GOVERNMENT,
            SourceBucket.INDUSTRY, EvaluatorType.INDUSTRY,
            SourceBucket.COMMUNITY, EvaluatorType.COMMUNITY,
            SourceBucket.HEI, EvaluatorType.HEI,
            SourceBucket.CITIZEN, EvaluatorType.CITIZEN
    ));

    /** Assignment statuses that count toward an evaluator's open workload. */
    private static final List<AssignmentStatus> OPEN_STATUSES =
            List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS);

    private final EvaluationCycleRepository cycleRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;
    private final ProblemContextGateway problemGateway;
    private final long deadlineDays;

    public EvaluationRoutingService(EvaluationCycleRepository cycleRepository,
                                    EvaluatorProfileRepository profileRepository,
                                    EvaluationAssignmentRepository assignmentRepository,
                                    EvaluationStatusService statusService,
                                    AuditService auditService,
                                    ProblemContextGateway problemGateway,
                                    @Value("${app.evaluation.assignment-deadline-days:7}") long deadlineDays) {
        this.cycleRepository = cycleRepository;
        this.profileRepository = profileRepository;
        this.assignmentRepository = assignmentRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.problemGateway = problemGateway;
        this.deadlineDays = deadlineDays;
    }

    @Transactional
    public RouteOutcomeResponse route(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));

        if (cycle.getStatus() != EvaluationStatus.ROUTING) {
            return notRouted("cycle is " + cycle.getStatus() + "; routing requires ROUTING");
        }

        ProblemContextResponse problem = problemGateway.fetch(cycle.getProblemId());
        EvaluatorType pool = poolFor(problem.sourceBucket());

        // Anyone who already holds an assignment for this cycle is out: either they are
        // still working on it, or they declined/expired it. Re-assigning them would also
        // violate UNIQUE (cycle_id, evaluator_profile_id).
        Set<UUID> alreadyTried = assignmentRepository.findByCycleId(cycleId).stream()
                .map(EvaluationAssignment::getEvaluatorProfileId)
                .collect(Collectors.toSet());

        EvaluatorProfile chosen = leastLoadedCandidate(pool, alreadyTried);
        if (chosen == null) {
            return notRouted("no active " + pool + " evaluator under max_workload"
                    + (alreadyTried.isEmpty() ? ""
                    : " (excluding " + alreadyTried.size() + " already assigned to this cycle)"));
        }

        Instant now = Instant.now();
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setCycleId(cycleId);
        assignment.setEvaluatorProfileId(chosen.getProfileId());
        assignment.setAssignedByUserId(actorUserId);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setAssignedAt(now);
        assignment.setDeadline(now.plus(deadlineDays, ChronoUnit.DAYS));
        // Reassign: save() on a new entity whose @Version is pre-set (1) goes through
        // merge() and returns a managed copy — the original stays transient with a null
        // assignmentId until flush. Read the id from the returned copy.
        assignment = assignmentRepository.save(assignment);

        String comment = "Routed to " + pool + " profile " + chosen.getProfileId();
        statusService.transition(cycleId, EvaluationStatus.EVALUATION_IN_PROGRESS,
                actorUserId, comment);
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_ROUTED,
                actorUserId, null, snapshot(cycleId, assignment, pool), ipAddress);

        return new RouteOutcomeResponse(true, assignment.getAssignmentId(),
                chosen.getProfileId(), pool.name(), comment);
    }

    /**
     * Lowest open-load active profile strictly under its max_workload; ties → first.
     *
     * @param exclude profiles already assigned to the cycle (a re-route must pick
     *                someone new, not the evaluator who just declined)
     */
    private EvaluatorProfile leastLoadedCandidate(EvaluatorType pool, Set<UUID> exclude) {
        EvaluatorProfile chosen = null;
        long chosenLoad = 0;
        for (EvaluatorProfile candidate : profileRepository.findByEvaluatorTypeAndActiveIsTrue(pool)) {
            if (exclude.contains(candidate.getProfileId())) {
                continue;
            }
            long openLoad = assignmentRepository.countByEvaluatorProfileIdAndStatusIn(
                    candidate.getProfileId(), OPEN_STATUSES);
            if (openLoad < candidate.getMaxWorkload()
                    && (chosen == null || openLoad < chosenLoad)) {
                chosen = candidate;
                chosenLoad = openLoad;
            }
        }
        return chosen;
    }

    private static EvaluatorType poolFor(String sourceBucket) {
        SourceBucket bucket;
        try {
            bucket = sourceBucket == null ? null : SourceBucket.valueOf(sourceBucket);
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Unknown problem source bucket '" + sourceBucket + "'; cannot route");
        }
        EvaluatorType pool = bucket == null ? null : BUCKET_TO_POOL.get(bucket);
        if (pool == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Problem has no routable source bucket; cannot route");
        }
        return pool;
    }

    private Map<String, Object> snapshot(UUID cycleId, EvaluationAssignment assignment,
                                         EvaluatorType pool) {
        // HashMap (not Map.of): under a mocked repository @PrePersist has not run yet,
        // so assignmentId may be null; Map.of would throw on null values.
        Map<String, Object> snap = new HashMap<>();
        snap.put("cycleId", cycleId);
        snap.put("assignmentId", assignment.getAssignmentId());
        snap.put("profileId", assignment.getEvaluatorProfileId());
        snap.put("evaluatorType", pool.name());
        snap.put("deadline", assignment.getDeadline());
        return snap;
    }

    private RouteOutcomeResponse notRouted(String reason) {
        return new RouteOutcomeResponse(false, null, null, null, reason);
    }
}
