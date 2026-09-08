package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.stubbing.Answer;
import org.springframework.http.HttpStatus;

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
 */
class EvaluationRoutingServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository = mock(EvaluationAssignmentRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final ProblemContextGateway problemGateway = mock(ProblemContextGateway.class);

    private final EvaluationRoutingService service = new EvaluationRoutingService(
            cycleRepository, profileRepository, assignmentRepository,
            statusService, auditService, problemGateway, 7L);

    private final UUID actor = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();
    private final UUID assignedAssignmentId = UUID.randomUUID();

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
        assertThat(outcome.assignmentId()).isEqualTo(assignedAssignmentId);

        ArgumentCaptor<EvaluationAssignment> captor = ArgumentCaptor.forClass(EvaluationAssignment.class);
        verify(assignmentRepository).save(captor.capture());
        EvaluationAssignment saved = captor.getValue();
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

    /** @PrePersist normally fills the id; a mocked save does not — emulate it. */
    private void givenSaveAssignsId() {
        when(assignmentRepository.save(any(EvaluationAssignment.class))).thenAnswer(assignId());
    }

    private Answer<EvaluationAssignment> assignId() {
        return inv -> {
            EvaluationAssignment assignment = inv.getArgument(0);
            assignment.setAssignmentId(assignedAssignmentId);
            return assignment;
        };
    }
}
