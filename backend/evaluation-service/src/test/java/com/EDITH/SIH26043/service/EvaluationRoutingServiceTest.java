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
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.AssignmentOutcomeResponse;
import com.EDITH.SIH26043.web.dto.RouteAllOutcomeResponse;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import com.EDITH.SIH26043.web.dto.ScoreSubmissionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Phase 2 routing step: a problem from a government department goes to the
 * least-loaded active GOVERNMENT evaluator, an industry problem to INDUSTRY, and
 * so on. One ASSIGNED assignment is created, the cycle advances ROUTING →
 * EVALUATION_IN_PROGRESS, and an EVALUATION_ROUTED audit row records the handoff.
 *
 * <p>The second half covers the five-pool pass, where the per-pool MANUAL/AUTO
 * switch decides whether a pool's scorecard comes from its system AI profile or
 * from a human — and where an unavailable model must degrade that one pool, never
 * the cycle.</p>
 */
class EvaluationRoutingServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository = mock(EvaluationAssignmentRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final ProblemContextGateway problemGateway = mock(ProblemContextGateway.class);
    private final EvaluatorPoolModeService poolModeService = mock(EvaluatorPoolModeService.class);
    private final AutoEvaluationService autoEvaluationService = mock(AutoEvaluationService.class);
    private final EvaluatorAssignmentService assignmentService = mock(EvaluatorAssignmentService.class);

    private final EvaluationRoutingService service = new EvaluationRoutingService(
            cycleRepository, profileRepository, assignmentRepository,
            statusService, auditService, problemGateway, poolModeService,
            autoEvaluationService, assignmentService, 7L);

    private final UUID actor = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    /** Every profile handed out by {@link #activeProfile}, so findAllById can resolve ids. */
    private final List<EvaluatorProfile> knownProfiles = new ArrayList<>();

    @BeforeEach
    void defaultEveryPoolToManual() {
        // modeOf is contractually non-null (missing row ⇒ MANUAL); a bare mock would
        // return null and NPE the audit snapshot.
        for (EvaluatorType pool : EvaluatorType.values()) {
            when(poolModeService.modeOf(pool)).thenReturn(EvaluationMode.MANUAL);
        }
        when(profileRepository.findAllById(any())).thenAnswer(inv -> {
            Iterable<UUID> ids = inv.getArgument(0);
            List<UUID> wanted = new ArrayList<>();
            ids.forEach(wanted::add);
            return knownProfiles.stream().filter(p -> wanted.contains(p.getProfileId())).toList();
        });
    }

    @Test
    void govtProblemIsRoutedToLeastLoadedActiveGovernmentEvaluator() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile evaluator = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(evaluator));
        givenOpenLoad(evaluator.getProfileId(), 0);
        givenSaveAssignsId();

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isTrue();
        assertThat(outcome.profileId()).isEqualTo(evaluator.getProfileId());
        assertThat(outcome.evaluatorType()).isEqualTo("GOVERNMENT");

        ArgumentCaptor<EvaluationAssignment> captor = ArgumentCaptor.forClass(EvaluationAssignment.class);
        verify(assignmentRepository).save(captor.capture());
        EvaluationAssignment saved = captor.getValue();
        assertThat(outcome.assignmentId()).isEqualTo(saved.getAssignmentId());
        assertThat(saved.getCycleId()).isEqualTo(cycleId);
        assertThat(saved.getEvaluatorProfileId()).isEqualTo(evaluator.getProfileId());
        assertThat(saved.getAssignedByUserId()).isEqualTo(actor);
        assertThat(saved.getStatus()).isEqualTo(AssignmentStatus.ASSIGNED);
        assertThat(saved.getAssignedAt()).isNotNull();
        assertThat(saved.getDeadline()).isAfter(saved.getAssignedAt());

        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.EVALUATION_IN_PROGRESS),
                eq(actor), org.mockito.ArgumentMatchers.contains("GOVERNMENT"));
        verify(auditService).record(eq("PROBLEM"), eq(problemId), eq(AuditAction.EVALUATION_ROUTED),
                eq(actor), isNull(), anyMap(), eq("127.0.0.1"));
    }

    @Test
    void leastLoadedCandidateIsChosenOverABusierOne() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile busy = activeProfile(EvaluatorType.GOVERNMENT, 5);
        EvaluatorProfile free = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(busy, free));
        // busy has 2 open assignments, free has 0 → free must win even though it sorts last.
        givenOpenLoad(busy.getProfileId(), 2);
        givenOpenLoad(free.getProfileId(), 0);
        givenSaveAssignsId();

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isTrue();
        assertThat(outcome.profileId()).isEqualTo(free.getProfileId());
    }

    @Test
    void inactiveProfilesAreNeverConsidered() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of()); // only inactive profiles exist → repo filters them out

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isFalse();
        assertThat(outcome.message()).contains("no active GOVERNMENT evaluator");
        verify(assignmentRepository, never()).save(any());
        verify(statusService, never()).transition(eq(cycleId), eq(EvaluationStatus.EVALUATION_IN_PROGRESS),
                any(), anyString());
    }

    @Test
    void allCandidatesAtMaxWorkloadKeepsCycleRouting() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile saturated = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(saturated));
        givenOpenLoad(saturated.getProfileId(), 5); // == max_workload → not eligible

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isFalse();
        assertThat(outcome.message()).contains("under max_workload");
        verify(assignmentRepository, never()).save(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void routingANonRoutingCycleIsANoOp() {
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isFalse();
        assertThat(outcome.message()).contains("requires ROUTING");
        verify(problemGateway, never()).fetch(any());
        verify(profileRepository, never()).findByEvaluatorTypeAndActiveIsTrue(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void unknownBucketIsRejectedAsBadRequest() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("ALIEN");

        assertThatThrownBy(() -> service.route(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(assignmentRepository, never()).save(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void everyProblemBucketMapsToItsEvaluatorPool() {
        Map<String, EvaluatorType> buckets = Map.of(
                "GOVT", EvaluatorType.GOVERNMENT,
                "INDUSTRY", EvaluatorType.INDUSTRY,
                "COMMUNITY", EvaluatorType.COMMUNITY,
                "HEI", EvaluatorType.HEI,
                "CITIZEN", EvaluatorType.CITIZEN);

        buckets.forEach((bucket, pool) -> {
            givenCycle(EvaluationStatus.ROUTING);
            givenProblem(bucket);
            EvaluatorProfile evaluator = activeProfile(pool, 5);
            when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(pool))
                    .thenReturn(List.of(evaluator));
            givenOpenLoad(evaluator.getProfileId(), 0);
            givenSaveAssignsId();

            RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

            assertThat(outcome.routed()).as("bucket %s should route", bucket).isTrue();
            assertThat(outcome.evaluatorType()).as("bucket %s should route to %s", bucket, pool)
                    .isEqualTo(pool.name());
        });
    }

    @Test
    void aRerouteSkipsTheEvaluatorWhoAlreadyHadThisCycle() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile declined = activeProfile(EvaluatorType.GOVERNMENT, 5);
        EvaluatorProfile fresh = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(declined, fresh));
        // The declined assignment no longer counts as open work, so on load alone the
        // decliner would win again — and UNIQUE (cycle_id, evaluator_profile_id) would blow up.
        givenOpenLoad(declined.getProfileId(), 0);
        givenOpenLoad(fresh.getProfileId(), 3);
        givenCycleAssignments(declined.getProfileId());
        givenSaveAssignsId();

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isTrue();
        assertThat(outcome.profileId()).isEqualTo(fresh.getProfileId());
    }

    @Test
    void aRerouteWithNobodyLeftKeepsCycleRouting() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile onlyOne = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(onlyOne));
        givenOpenLoad(onlyOne.getProfileId(), 0);
        givenCycleAssignments(onlyOne.getProfileId());

        RouteOutcomeResponse outcome = service.route(cycleId, actor, "127.0.0.1");

        assertThat(outcome.routed()).isFalse();
        assertThat(outcome.message()).contains("already assigned to this cycle");
        verify(assignmentRepository, never()).save(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void unknownCycleIsNotFound() {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.route(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ------------------------------------------------------------- five-pool pass

    @Test
    void autoPoolMatchingTheProblemSourceIsScoredWithoutRoutingToOtherPools() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile ai = systemProfile(EvaluatorType.GOVERNMENT);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(ai));
        givenMode(EvaluatorType.GOVERNMENT, EvaluationMode.AUTO);
        givenAiScores(EvaluatorType.GOVERNMENT);
        givenSystemSubmitSucceeds();
        givenSaveAssignsId();

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        assertThat(outcome.assignmentsCreated()).isEqualTo(1);
        assertThat(outcome.cycleStatus()).isEqualTo(EvaluationStatus.EVALUATION_IN_PROGRESS.name());

        RouteAllOutcomeResponse.PoolRoutingOutcome govt = pool(outcome, "GOVERNMENT");
        assertThat(govt.handler()).isEqualTo("AI");
        assertThat(govt.mode()).isEqualTo("AUTO");
        assertThat(govt.routed()).isTrue();
        assertThat(govt.scoreSource()).isEqualTo("AI");
        assertThat(govt.assignmentStatus()).isEqualTo("SUBMITTED");
        assertThat(govt.profileId()).isEqualTo(ai.getProfileId());

        // The source bucket is GOVT, so an eligible INDUSTRY evaluator is ignored.
        assertThat(pool(outcome, "INDUSTRY").routed()).isFalse();
        assertThat(pool(outcome, "HEI").routed()).isFalse();
        assertThat(pool(outcome, "CITIZEN").handler()).isEqualTo("NONE");

        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.EVALUATION_IN_PROGRESS),
                eq(actor), anyString());
        // Only the AUTO pool's scorecard goes through the system submit path.
        verify(assignmentService).submitAsSystem(eq(govt.assignmentId()), any(), eq("openai-compatible"),
                eq("test-model"), eq(actor), eq("127.0.0.1"));
    }

    @Test
    void anUnavailableAiDegradesThatPoolToAHumanAndAuditsIt() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        EvaluatorProfile human = activeProfile(EvaluatorType.GOVERNMENT, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(human));
        givenOpenLoad(human.getProfileId(), 0);
        givenMode(EvaluatorType.GOVERNMENT, EvaluationMode.AUTO);
        when(autoEvaluationService.prepare(eq(cycleId), any(), eq(EvaluatorType.GOVERNMENT)))
                .thenReturn(Optional.empty());
        givenSaveAssignsId();

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        // The switch did not change — this run simply could not honour it.
        RouteAllOutcomeResponse.PoolRoutingOutcome govt = pool(outcome, "GOVERNMENT");
        assertThat(govt.mode()).isEqualTo("AUTO");
        assertThat(govt.handler()).isEqualTo("HUMAN");
        assertThat(govt.routed()).isTrue();
        assertThat(govt.reason()).contains("unavailable");
        assertThat(govt.scoreSource()).isNull();
        assertThat(outcome.assignmentsCreated()).isEqualTo(1);

        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.EVALUATION_AI_UNAVAILABLE), eq(actor), isNull(), anyMap(),
                eq("127.0.0.1"));
        verify(assignmentService, never()).submitAsSystem(any(), any(), any(), any(), any(), any());
    }

    @Test
    void aSystemProfileIsNeverOfferedToAManualPool() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");
        // The AI profile has the least work, but the pool is MANUAL: it must stay unassigned
        // rather than quietly become machine-scored.
        EvaluatorProfile ai = systemProfile(EvaluatorType.GOVERNMENT);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(ai));
        givenOpenLoad(ai.getProfileId(), 0);

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        RouteAllOutcomeResponse.PoolRoutingOutcome govt = pool(outcome, "GOVERNMENT");
        assertThat(govt.routed()).isFalse();
        assertThat(govt.reason()).contains("no active GOVERNMENT human evaluator");
        assertThat(outcome.assignmentsCreated()).isZero();
        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void routesOnlyToThePoolMatchingTheProblemSourceBucket() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("HEI");
        EvaluatorProfile hei = activeProfile(EvaluatorType.HEI, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.HEI))
                .thenReturn(List.of(hei));
        givenOpenLoad(hei.getProfileId(), 0);
        givenSaveAssignsId();

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        assertThat(outcome.assignmentsCreated()).isEqualTo(1);
        assertThat(pool(outcome, "HEI").routed()).isTrue();
        assertThat(pool(outcome, "GOVERNMENT").routed()).isFalse();
        assertThat(outcome.message()).contains("1 of 5 pools routed");
        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.EVALUATION_IN_PROGRESS),
                eq(actor), anyString());
    }

    @Test
    void noRoutablePoolAnywhereKeepsTheCycleInRouting() {
        givenCycle(EvaluationStatus.ROUTING);
        givenProblem("GOVT");

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        assertThat(outcome.assignmentsCreated()).isZero();
        assertThat(outcome.cycleStatus()).isEqualTo(EvaluationStatus.ROUTING.name());
        assertThat(outcome.message()).contains("No pool could be routed");
        assertThat(outcome.pools()).hasSize(EvaluatorType.values().length);
        verify(statusService, never()).transition(any(), any(), any(), anyString());
        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void poolsThatAlreadyHoldAnAssignmentAreSkippedByTheRepairPass() {
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        givenProblem("GOVT");
        EvaluatorProfile already = activeProfile(EvaluatorType.GOVERNMENT, 5);
        givenAssignmentExists(already, AssignmentStatus.SUBMITTED);
        EvaluatorProfile hei = activeProfile(EvaluatorType.HEI, 5);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.HEI))
                .thenReturn(List.of(hei));
        givenOpenLoad(hei.getProfileId(), 0);
        givenSaveAssignsId();

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        // A GOVT problem routes only to GOVERNMENT; other pools stay untouched.
        RouteAllOutcomeResponse.PoolRoutingOutcome govt = pool(outcome, "GOVERNMENT");
        assertThat(govt.routed()).isFalse();
        assertThat(govt.reason()).contains("already has an assignment");
        assertThat(pool(outcome, "HEI").routed()).isFalse();
        assertThat(outcome.assignmentsCreated()).isZero();
        // Already EVALUATION_IN_PROGRESS: the repair pass must not re-transition.
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void aCompletedCycleIsNotRoutable() {
        givenCycle(EvaluationStatus.EVALUATION_COMPLETED);

        RouteAllOutcomeResponse outcome = service.routeAllPools(cycleId, actor, "127.0.0.1");

        assertThat(outcome.assignmentsCreated()).isZero();
        assertThat(outcome.pools()).isEmpty();
        assertThat(outcome.message()).contains("requires ROUTING or EVALUATION_IN_PROGRESS");
        verify(problemGateway, never()).fetch(any());
    }

    // ------------------------------------------------------------------- fixtures

    /** A seeded system AI profile (V4): real profile row, no human behind it. */
    private EvaluatorProfile systemProfile(EvaluatorType type) {
        EvaluatorProfile profile = activeProfile(type, 100000);
        profile.setFullName("AI Evaluator — " + type);
        profile.setSystem(true);
        return profile;
    }

    private void givenMode(EvaluatorType pool, EvaluationMode mode) {
        when(poolModeService.modeOf(pool)).thenReturn(mode);
    }

    private void givenAiScores(EvaluatorType pool) {
        when(autoEvaluationService.prepare(eq(cycleId), any(), eq(pool)))
                .thenReturn(Optional.of(new AutoEvaluationService.PreparedScorecard(
                        new ScoreSubmissionRequest(List.of(), "Strong problem", "SHORTLIST"),
                        "openai-compatible", "test-model", 5)));
    }

    private void givenSystemSubmitSucceeds() {
        when(assignmentService.submitAsSystem(any(), any(), anyString(), anyString(), any(), anyString()))
                .thenAnswer(inv -> new AssignmentOutcomeResponse(inv.getArgument(0),
                        AssignmentStatus.SUBMITTED, Instant.now(), 5,
                        EvaluationStatus.EVALUATION_IN_PROGRESS, "system scorecard stored"));
    }

    /** An assignment already on the cycle, owned by {@code owner}. */
    private void givenAssignmentExists(EvaluatorProfile owner, AssignmentStatus status) {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(UUID.randomUUID());
        assignment.setCycleId(cycleId);
        assignment.setEvaluatorProfileId(owner.getProfileId());
        assignment.setStatus(status);
        when(assignmentRepository.findByCycleId(cycleId)).thenReturn(List.of(assignment));
    }

    private RouteAllOutcomeResponse.PoolRoutingOutcome pool(RouteAllOutcomeResponse outcome,
                                                           String evaluatorType) {
        return outcome.pools().stream()
                .filter(p -> p.evaluatorType().equals(evaluatorType))
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "no outcome reported for pool " + evaluatorType));
    }

    private void givenCycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(status);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
    }

    private void givenProblem(String sourceBucket) {
        when(problemGateway.fetch(problemId)).thenReturn(new ProblemContextResponse(
                problemId, "REGISTERED", "Irregular drinking water supply",
                "Hand pumps dry during summer.", sourceBucket, null, null, null, null,
                null, null, null, List.of(), 0, null, List.of()));
    }

    private EvaluatorProfile activeProfile(EvaluatorType type, int maxWorkload) {
        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setProfileId(UUID.randomUUID());
        profile.setUserId(UUID.randomUUID());
        profile.setEvaluatorType(type);
        profile.setFullName("Evaluator " + type);
        profile.setMaxWorkload(maxWorkload);
        profile.setActive(true);
        knownProfiles.add(profile);
        return profile;
    }

    private void givenOpenLoad(UUID profileId, long openAssignments) {
        when(assignmentRepository.countByEvaluatorProfileIdAndStatusIn(
                eq(profileId), anyCollection())).thenReturn(openAssignments);
    }

    /** Profiles that already hold an assignment for this cycle (a decline left one behind). */
    private void givenCycleAssignments(UUID... profileIds) {
        List<EvaluationAssignment> existing = java.util.Arrays.stream(profileIds)
                .map(profileId -> {
                    EvaluationAssignment assignment = new EvaluationAssignment();
                    assignment.setAssignmentId(UUID.randomUUID());
                    assignment.setCycleId(cycleId);
                    assignment.setEvaluatorProfileId(profileId);
                    assignment.setStatus(AssignmentStatus.DECLINED);
                    return assignment;
                })
                .toList();
        when(assignmentRepository.findByCycleId(cycleId)).thenReturn(existing);
    }

    /** @PrePersist normally fills the id; a mocked save does not — emulate it, one per row. */
    private void givenSaveAssignsId() {
        when(assignmentRepository.save(any(EvaluationAssignment.class))).thenAnswer(inv -> {
            EvaluationAssignment assignment = inv.getArgument(0);
            assignment.setAssignmentId(UUID.randomUUID());
            return assignment;
        });
    }
}
