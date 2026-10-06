package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationMode;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.enums.ScoreSource;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.AssignmentOutcomeResponse;
import com.EDITH.SIH26043.web.dto.RouteAllOutcomeResponse;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 2 routing step. Two entry points over the same helpers:
 *
 * <ul>
 *   <li>{@link #route} — the original bucket-based handoff: ONE assignment for the
 *       pool matching the problem's origin bucket. Kept for the ADMIN retry
 *       endpoint ({@code POST /evaluation/cycles/{cycleId}/route}).</li>
 *   <li>{@link #routeAllPools} — the five-pool pass: every pool gets an
 *       assignment, so a completed cycle carries five scorecards (one per expert
 *       perspective) instead of one. This is what makes the seeded per-pool
 *       aggregation weights meaningful, and it is where the MANUAL/AUTO switch is
 *       honoured.</li>
 * </ul>
 *
 * <p><b>Per-pool handler.</b> A pool on {@code AUTO} is assigned to its own
 * system AI profile and scored immediately; a pool on {@code MANUAL} is offered
 * to the least-loaded active human evaluator of that pool, as before. The AI
 * scorecard is prepared <em>before</em> the assignment exists, so when the model
 * cannot score (no key, endpoint down, unusable JSON, an incomplete scorecard)
 * the pool degrades to a human without leaving a stray AI assignment behind —
 * and either way an {@code EVALUATION_AI_UNAVAILABLE} audit row says why.</p>
 *
 * <p>Exactly one assignment row per pool ({@code status=ASSIGNED}, or already
 * {@code SUBMITTED} for AI), the cycle moves {@code ROUTING →
 * EVALUATION_IN_PROGRESS}, and each handoff writes an {@code EVALUATION_ROUTED}
 * audit row. A pool with nobody available is skipped — no row, so it simply does
 * not contribute to cycle completion.</p>
 *
 * <p>{@code is_system} profiles are never candidates for a MANUAL pool, and a
 * re-route skips every profile that already holds an assignment for the cycle, so
 * {@code UNIQUE (cycle_id, evaluator_profile_id)} is never violated and a r
 * -eroute moves the problem to a genuinely different evaluator.</p>
 */
@Service
public class EvaluationRoutingService {

    /** Bucket of origin → evaluator pool that scores it (single-pool routing). */
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

    /** Cycle statuses from which a (re-)routing pass makes sense. */
    private static final EnumSet<EvaluationStatus> ROUTABLE_STATUSES =
            EnumSet.of(EvaluationStatus.ROUTING, EvaluationStatus.EVALUATION_IN_PROGRESS);

    private static final String HANDLER_AI = "AI";
    private static final String HANDLER_HUMAN = "HUMAN";
    private static final String HANDLER_NONE = "NONE";

    private final EvaluationCycleRepository cycleRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;
    private final ProblemContextGateway problemGateway;
    private final EvaluatorPoolModeService poolModeService;
    private final AutoEvaluationService autoEvaluationService;
    private final EvaluatorAssignmentService assignmentService;
    private final long deadlineDays;

    public EvaluationRoutingService(EvaluationCycleRepository cycleRepository,
                                    EvaluatorProfileRepository profileRepository,
                                    EvaluationAssignmentRepository assignmentRepository,
                                    EvaluationStatusService statusService,
                                    AuditService auditService,
                                    ProblemContextGateway problemGateway,
                                    EvaluatorPoolModeService poolModeService,
                                    AutoEvaluationService autoEvaluationService,
                                    EvaluatorAssignmentService assignmentService,
                                    @Value("${app.evaluation.assignment-deadline-days:7}") long deadlineDays) {
        this.cycleRepository = cycleRepository;
        this.profileRepository = profileRepository;
        this.assignmentRepository = assignmentRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.problemGateway = problemGateway;
        this.poolModeService = poolModeService;
        this.autoEvaluationService = autoEvaluationService;
        this.assignmentService = assignmentService;
        this.deadlineDays = deadlineDays;
    }

    // ---------------------------------------------------------------------------
    // single-pool routing (bucket-based; the ADMIN retry endpoint)
    // ---------------------------------------------------------------------------

    @Transactional
    public RouteOutcomeResponse route(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = requireCycle(cycleId);

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

        EvaluationAssignment assignment = saveAssignment(cycleId, chosen, actorUserId);
        String comment = "Routed to " + pool + " profile " + chosen.getProfileId();
        statusService.transition(cycleId, EvaluationStatus.EVALUATION_IN_PROGRESS,
                actorUserId, comment);
        auditRouted(cycle, pool, HANDLER_HUMAN, assignment, actorUserId, ipAddress);

        return new RouteOutcomeResponse(true, assignment.getAssignmentId(),
                chosen.getProfileId(), pool.name(), comment);
    }

    /** ADMIN-directed handoff for a submitted government problem. */
    @Transactional
    public RouteOutcomeResponse routeGovernmentProblemTo(UUID problemId, UUID evaluatorUserId,
                                                          UUID actorUserId,
                                                          String ipAddress) {
        ProblemContextResponse problem = problemGateway.fetch(problemId);
        if (!"GOVT".equals(problem.sourceBucket()) || !"SUBMITTED".equals(problem.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Only submitted GOVT problems can be assigned through this operation");
        }
        EvaluationCycle cycle = cycleRepository.findByProblemId(problemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "No evaluation cycle exists for problem " + problemId));
        if (!ROUTABLE_STATUSES.contains(cycle.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Problem " + problemId + " is already in cycle state " + cycle.getStatus());
        }

        EvaluatorProfile target = profileRepository.findByUserId(evaluatorUserId).stream()
                .filter(p -> p.getEvaluatorType() == EvaluatorType.GOVERNMENT
                        && p.isActive() && !p.isSystem())
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Active human GOVERNMENT evaluator profile not found for user " + evaluatorUserId));

        List<EvaluationAssignment> cycleAssignments = assignmentRepository.findByCycleId(cycle.getCycleId());
        Map<UUID, EvaluatorProfile> profiles = profileRepository.findAllById(cycleAssignments.stream()
                .map(EvaluationAssignment::getEvaluatorProfileId).toList()).stream()
                .collect(Collectors.toMap(EvaluatorProfile::getProfileId, p -> p));
        EvaluationAssignment governmentAssignment = cycleAssignments.stream()
                .filter(a -> profiles.containsKey(a.getEvaluatorProfileId()))
                .filter(a -> profiles.get(a.getEvaluatorProfileId()).getEvaluatorType()
                        == EvaluatorType.GOVERNMENT)
                .findFirst().orElse(null);

        if (governmentAssignment != null && governmentAssignment.getEvaluatorProfileId()
                .equals(target.getProfileId())) {
            return new RouteOutcomeResponse(true, governmentAssignment.getAssignmentId(),
                    target.getProfileId(), EvaluatorType.GOVERNMENT.name(),
                    "Already assigned to the requested government evaluator");
        }
        if (governmentAssignment != null
                && governmentAssignment.getStatus() != AssignmentStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Existing government assignment is " + governmentAssignment.getStatus()
                            + "; only unaccepted assignments can be transferred safely");
        }
        boolean targetAlreadyOnCycle = cycleAssignments.stream()
                .anyMatch(a -> a.getEvaluatorProfileId().equals(target.getProfileId()));
        if (targetAlreadyOnCycle && (governmentAssignment == null
                || !governmentAssignment.getEvaluatorProfileId().equals(target.getProfileId()))) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Target evaluator already has an assignment on this cycle");
        }

        Instant now = Instant.now();
        long targetOpen = assignmentRepository.countByEvaluatorProfileIdAndStatusIn(
                target.getProfileId(), OPEN_STATUSES);
        if (targetOpen >= target.getMaxWorkload()) {
            target.setMaxWorkload(Math.toIntExact(targetOpen + 1));
            profileRepository.save(target);
        }

        UUID previousProfileId = governmentAssignment == null
                ? null : governmentAssignment.getEvaluatorProfileId();
        if (governmentAssignment == null) {
            governmentAssignment = saveAssignment(cycle.getCycleId(), target, actorUserId, now);
        } else {
            governmentAssignment.setEvaluatorProfileId(target.getProfileId());
            governmentAssignment.setAssignedByUserId(actorUserId);
            governmentAssignment.setAssignedAt(now);
            governmentAssignment.setDeadline(now.plus(deadlineDays, ChronoUnit.DAYS));
            governmentAssignment = assignmentRepository.save(governmentAssignment);
        }

        if (cycle.getStatus() == EvaluationStatus.ROUTING) {
            statusService.transition(cycle.getCycleId(), EvaluationStatus.EVALUATION_IN_PROGRESS,
                    actorUserId, "Government assignment directed to evaluator profile " + target.getProfileId());
        }
        Map<String, Object> before = new HashMap<>();
        before.put("cycleId", cycle.getCycleId());
        before.put("assignmentId", governmentAssignment.getAssignmentId());
        before.put("profileId", previousProfileId);
        Map<String, Object> after = snapshot(cycle.getCycleId(), governmentAssignment,
                EvaluatorType.GOVERNMENT);
        after.put("handler", HANDLER_HUMAN);
        after.put("mode", poolModeService.modeOf(EvaluatorType.GOVERNMENT).name());
        after.put("directedByAdmin", true);
        auditService.record("PROBLEM", problemId, AuditAction.EVALUATION_ASSIGNED,
                actorUserId, before, after, ipAddress);

        return new RouteOutcomeResponse(true, governmentAssignment.getAssignmentId(),
                target.getProfileId(), EvaluatorType.GOVERNMENT.name(),
                previousProfileId == null ? "Assigned directly to requested government evaluator"
                        : "Pending government assignment transferred to requested evaluator");
    }

    // ---------------------------------------------------------------------------
    // multi-pool routing (all five pools; the AUTO/MANUAL switch applies here)
    // ---------------------------------------------------------------------------

    /**
     * Creates (or, for AUTO pools, creates and immediately completes) one
     * assignment per evaluator pool.
     *
     * <p>Runnable from {@code ROUTING} and from {@code EVALUATION_IN_PROGRESS}: the
     * second form is a repair pass, filling in pools that were skipped earlier (no
     * candidate at the time, or the model was down) without disturbing the pools
     * that already have an assignment. Pools that already hold one are reported as
     * skipped rather than re-routed, because re-assigning would violate
     * {@code UNIQUE (cycle_id, evaluator_profile_id)}.</p>
     *
     * @return the per-pool outcome, including the pools that were skipped and why
     */
    @Transactional
    public RouteAllOutcomeResponse routeAllPools(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = requireCycle(cycleId);
        EvaluationStatus entryStatus = cycle.getStatus();
        if (!ROUTABLE_STATUSES.contains(entryStatus)) {
            return new RouteAllOutcomeResponse(cycleId, entryStatus.name(), 0,
                    "cycle is " + entryStatus
                            + "; multi-pool routing requires ROUTING or EVALUATION_IN_PROGRESS",
                    List.of());
        }

        ProblemContextResponse problem = problemGateway.fetch(cycle.getProblemId());

        List<EvaluationAssignment> existing = assignmentRepository.findByCycleId(cycleId);
        Set<UUID> alreadyAssigned = existing.stream()
                .map(EvaluationAssignment::getEvaluatorProfileId)
                .collect(Collectors.toSet());
        Set<EvaluatorType> poolsAlreadyAssigned = poolsOf(alreadyAssigned);

        // Phase 1 — decide every pool's handler, asking the AI to score the AUTO ones.
        // Doing the model call here (before any assignment exists) is what makes the
        // degradation path clean: a failed AI pool simply falls through to a human.
        EvaluatorType targetPool = poolFor(problem.sourceBucket());
        List<PoolPlan> plans = new ArrayList<>(1);
        plans.add(planFor(cycle, problem, targetPool, alreadyAssigned, poolsAlreadyAssigned,
                actorUserId, ipAddress));

        // Phase 2 — persist the assignments, then move the cycle once.
        Instant now = Instant.now();
        List<PlannedAssignment> planned = new ArrayList<>(plans.size());
        for (PoolPlan plan : plans) {
            if (!plan.routed()) {
                planned.add(new PlannedAssignment(plan, null));
                continue;
            }
            EvaluationAssignment assignment =
                    saveAssignment(cycleId, plan.profile(), actorUserId, now);
            auditRouted(cycle, plan.pool(), plan.handler(), assignment, actorUserId, ipAddress);
            planned.add(new PlannedAssignment(plan, assignment));
        }
        long created = planned.stream().filter(p -> p.assignment() != null).count();

        // The transition happens only now, and only from ROUTING: from
        // EVALUATION_IN_PROGRESS the cycle is already where it needs to be. This is
        // also why phase 3 can safely let the last AI submit complete the cycle —
        // every sibling assignment already exists by then, so "no open assignment
        // left" genuinely means "the cycle is done" rather than "we have not got
        // round to creating the others yet".
        if (created > 0 && entryStatus == EvaluationStatus.ROUTING) {
            statusService.transition(cycleId, EvaluationStatus.EVALUATION_IN_PROGRESS, actorUserId,
                    created + " pool assignment(s) created");
        }

        // Phase 3 — the AUTO pools' scorecards, through the normal submit path.
        Map<EvaluatorType, AssignmentOutcomeResponse> submitted =
                new EnumMap<>(EvaluatorType.class);
        for (PlannedAssignment pa : planned) {
            if (pa.assignment() == null || !pa.plan().isAi()) {
                continue;
            }
            AutoEvaluationService.PreparedScorecard card = pa.plan().scorecard();
            submitted.put(pa.plan().pool(), assignmentService.submitAsSystem(
                    pa.assignment().getAssignmentId(), card.request(),
                    card.provider(), card.model(), actorUserId, ipAddress));
        }

        List<RouteAllOutcomeResponse.PoolRoutingOutcome> outcomes =
                new ArrayList<>(EvaluatorType.values().length);

        RouteAllOutcomeResponse.PoolRoutingOutcome targetPoolOutcome = null;
        for (PlannedAssignment pa : planned) {
            PoolPlan plan = pa.plan();
            EvaluationAssignment assignment = pa.assignment();
            if (assignment == null) {
                targetPoolOutcome = new RouteAllOutcomeResponse.PoolRoutingOutcome(
                        plan.pool().name(), plan.mode().name(), HANDLER_NONE, false,
                        null, null, null, null, plan.reason());
                continue;
            }
            AssignmentOutcomeResponse outcome = submitted.get(plan.pool());
            targetPoolOutcome = new RouteAllOutcomeResponse.PoolRoutingOutcome(
                    plan.pool().name(), plan.mode().name(), plan.handler(), true,
                    assignment.getAssignmentId(), plan.profile().getProfileId(),
                    outcome == null ? assignment.getStatus().name() : outcome.status().name(),
                    plan.isAi() ? ScoreSource.AI.name() : null,
                    plan.reason());
        }

        for (EvaluatorType pool : EvaluatorType.values()) {
            if (pool.equals(targetPool)) {
                outcomes.add(targetPoolOutcome);
            } else {
                outcomes.add(new RouteAllOutcomeResponse.PoolRoutingOutcome(
                        pool.name(), poolModeService.modeOf(pool).name(), HANDLER_NONE, false,
                        null, null, null, null,
                        "Not applicable per source bucket routing rules - problem belongs to "
                                + problem.sourceBucket() + " pool"));
            }
        }

        // Phase 3 can complete the cycle outright: submitting the last scorecard runs the
        // normal completion check, which moves EVALUATION_IN_PROGRESS -> EVALUATION_COMPLETED
        // on the very cycle instance held here. The entity therefore wins when it moved
        // further than routing alone would take it.
        EvaluationStatus finalStatus = cycle.getStatus();
        if (finalStatus == entryStatus) {
            finalStatus = created > 0
                    ? EvaluationStatus.EVALUATION_IN_PROGRESS
                    : entryStatus;
        }
        String cycleStatus = finalStatus.name();
        String message = created == 0
                ? "No pool could be routed; the cycle stays " + entryStatus
                : "1 of " + EvaluatorType.values().length + " pools routed (source bucket: "
                        + problem.sourceBucket() + ")";
        return new RouteAllOutcomeResponse(cycleId, cycleStatus, (int) created, message, outcomes);
    }

    // ---------------------------------------------------------------------------
    // planning
    // ---------------------------------------------------------------------------

    /**
     * Decides what should happen to one pool: an AI assignment, a human
     * assignment, or nothing.
     *
     * <p>A degraded AUTO pool reports its configured mode (AUTO) alongside
     * {@code handler=HUMAN} and a reason naming the degradation — the switch did
     * not change, this run just could not honour it.</p>
     */
    private PoolPlan planFor(EvaluationCycle cycle, ProblemContextResponse problem,
                             EvaluatorType pool, Set<UUID> alreadyAssigned,
                             Set<EvaluatorType> poolsAlreadyAssigned, UUID actorUserId,
                             String ipAddress) {
        EvaluationMode mode = poolModeService.modeOf(pool);

        if (poolsAlreadyAssigned.contains(pool)) {
            return new PoolPlan(pool, mode, HANDLER_NONE, null, null,
                    "already has an assignment for this cycle");
        }

        String degraded = null;
        if (mode == EvaluationMode.AUTO) {
            Optional<AutoEvaluationService.PreparedScorecard> prepared =
                    autoEvaluationService.prepare(cycle.getCycleId(), problem, pool);
            EvaluatorProfile ai = prepared.isPresent() ? systemProfile(pool) : null;
            if (prepared.isPresent() && ai != null) {
                return new PoolPlan(pool, mode, HANDLER_AI, ai, prepared.get(),
                        "AUTO pool — the AI scores and submits on its own");
            }
            degraded = prepared.isEmpty()
                    ? "AI scoring unavailable; degraded to a human for this run"
                    : "no active system AI profile for this pool; degraded to a human for this run";
            auditAiUnavailable(cycle, pool, actorUserId, ipAddress, degraded);
        }

        EvaluatorProfile human = leastLoadedCandidate(pool, alreadyAssigned);
        if (human == null) {
            String reason = (degraded == null ? "" : degraded + " — ")
                    + "no active " + pool + " human evaluator under max_workload";
            return new PoolPlan(pool, mode, HANDLER_NONE, null, null, reason);
        }
        return new PoolPlan(pool, mode, HANDLER_HUMAN, human, null,
                degraded != null ? degraded
                        : "MANUAL pool — the least-loaded human evaluator of this pool");
    }

    /**
     * Lowest open-load active <em>human</em> profile strictly under its
     * max_workload; ties → first.
     *
     * <p>System AI profiles are excluded unconditionally: they exist to be
     * assigned by the AUTO branch, and a MANUAL pool must never quietly become
     * machine-scored just because the AI profile happened to have the least
     * work.</p>
     *
     * @param exclude profiles already assigned to the cycle (a re-route must pick
     *                someone new, not the evaluator who just declined)
     */
    private EvaluatorProfile leastLoadedCandidate(EvaluatorType pool, Set<UUID> exclude) {
        EvaluatorProfile chosen = null;
        long chosenLoad = 0;
        for (EvaluatorProfile candidate : profileRepository.findByEvaluatorTypeAndActiveIsTrue(pool)) {
            if (candidate.isSystem() || exclude.contains(candidate.getProfileId())) {
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

    /** The pool's seeded system AI profile, or null when it is not there. */
    private EvaluatorProfile systemProfile(EvaluatorType pool) {
        // Reuses the active-profiles query rather than a dedicated derived query: the
        // per-pool profile list is small, and the filter keeps this honest even if a
        // system profile were ever (de)activated.
        return profileRepository.findByEvaluatorTypeAndActiveIsTrue(pool).stream()
                .filter(EvaluatorProfile::isSystem)
                .findFirst()
                .orElse(null);
    }

    /** Which pools already own an assignment for this cycle (one batch lookup). */
    private Set<EvaluatorType> poolsOf(Set<UUID> profileIds) {
        if (profileIds.isEmpty()) {
            return Set.of();
        }
        return profileRepository.findAllById(profileIds).stream()
                .map(EvaluatorProfile::getEvaluatorType)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    // ---------------------------------------------------------------------------
    // helpers
    // ---------------------------------------------------------------------------

    private EvaluationAssignment saveAssignment(UUID cycleId, EvaluatorProfile profile,
                                                UUID actorUserId) {
        return saveAssignment(cycleId, profile, actorUserId, Instant.now());
    }

    private EvaluationAssignment saveAssignment(UUID cycleId, EvaluatorProfile profile,
                                                UUID actorUserId, Instant now) {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setCycleId(cycleId);
        assignment.setEvaluatorProfileId(profile.getProfileId());
        assignment.setAssignedByUserId(actorUserId);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setAssignedAt(now);
        assignment.setDeadline(now.plus(deadlineDays, ChronoUnit.DAYS));
        // Reassign: save() on a new entity whose @Version is pre-set (1) goes through
        // merge() and returns a managed copy — the original stays transient with a null
        // assignmentId until flush. Read the id from the returned copy.
        return assignmentRepository.save(assignment);
    }

    private void auditRouted(EvaluationCycle cycle, EvaluatorType pool, String handler,
                             EvaluationAssignment assignment, UUID actorUserId, String ipAddress) {
        Map<String, Object> snap = snapshot(cycle.getCycleId(), assignment, pool);
        snap.put("handler", handler);
        snap.put("mode", poolModeService.modeOf(pool).name());
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_ROUTED,
                actorUserId, null, snap, ipAddress);
    }

    private void auditAiUnavailable(EvaluationCycle cycle, EvaluatorType pool, UUID actorUserId,
                                    String ipAddress, String reason) {
        Map<String, Object> after = new HashMap<>();
        after.put("cycleId", cycle.getCycleId());
        after.put("problemId", cycle.getProblemId());
        after.put("evaluatorType", pool.name());
        after.put("reason", reason);
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_AI_UNAVAILABLE,
                actorUserId, null, after, ipAddress);
    }

    private EvaluationCycle requireCycle(UUID cycleId) {
        return cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));
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

    // ---------------------------------------------------------------------------
    // internal carrier types
    // ---------------------------------------------------------------------------

    /**
     * What one pool's routing turn decided.
     *
     * @param handler   {@code AI}, {@code HUMAN} or {@code NONE}
     * @param profile   the evaluator (human or system AI); null when skipped
     * @param scorecard the prepared AI scorecard, non-null only for the AI handler
     */
    private record PoolPlan(
            EvaluatorType pool,
            EvaluationMode mode,
            String handler,
            EvaluatorProfile profile,
            AutoEvaluationService.PreparedScorecard scorecard,
            String reason
    ) {
        boolean routed() {
            return profile != null;
        }

        boolean isAi() {
            return HANDLER_AI.equals(handler);
        }
    }

    /** A plan paired with the assignment it produced (null when the pool was skipped). */
    private record PlannedAssignment(PoolPlan plan, EvaluationAssignment assignment) {
    }
}
