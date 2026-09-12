package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.AggregationStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.web.dto.AggregationResponse;
import com.EDITH.SIH26043.web.dto.PrioritizationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The best-effort orchestrator that runs aggregation + prioritisation the moment a
 * cycle completes.
 *
 * <p>The contract this suite protects is failure containment, not the maths: this
 * runs after the caller's transaction has already committed, so it must never turn
 * a successful scorecard submission into an error. Every test that provokes a
 * failure therefore asserts the exception does <em>not</em> escape, and the
 * no-op guards are checked because this must not re-clobber a cycle an ADMIN has
 * deliberately moved back for a re-aggregation.</p>
 */
class EvaluationCompletionServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository =
            mock(EvaluationAssignmentRepository.class);
    private final ScoreAggregationService aggregationService = mock(ScoreAggregationService.class);
    private final PrioritizationService prioritizationService = mock(PrioritizationService.class);

    private final UUID cycleId = UUID.randomUUID();
    private final UUID assignmentId = UUID.randomUUID();
    private final UUID actor = UUID.randomUUID();

    private EvaluationCompletionService service;

    @BeforeEach
    void setUp() {
        service = new EvaluationCompletionService(cycleRepository, assignmentRepository,
                aggregationService, prioritizationService);

        when(aggregationService.aggregate(any(), any(), any())).thenReturn(aggregation());
        when(prioritizationService.prioritize(any(), any(), any())).thenReturn(prioritization());
    }

    private EvaluationCycle cycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setStatus(status);
        cycle.setTriggeredByUserId(actor);
        return cycle;
    }

    private static AggregationResponse aggregation() {
        return new AggregationResponse(null, UUID.randomUUID(), AggregationStatus.AGGREGATED,
                null, null, java.util.Map.of(), 5, false, null, null,
                EvaluationStatus.SCORES_AGGREGATED, false, "Aggregated");
    }

    private static PrioritizationResponse prioritization() {
        return new PrioritizationResponse(null, null, null, null, null,
                EvaluationStatus.PHASE_3_READY, false, "Prioritised as P1");
    }

    // ------------------------------------------------------------------
    // the happy path
    // ------------------------------------------------------------------

    @Test
    void aCompletedCycleIsAggregatedAndThenPrioritised() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));

        service.runBestEffort(cycleId, "analyze");

        var order = inOrder(aggregationService, prioritizationService);
        order.verify(aggregationService).aggregate(cycleId, actor, "internal");
        order.verify(prioritizationService).prioritize(cycleId, actor, "internal");
    }

    @Test
    void theActorIsTheCyclesOwnTriggerAndTheIpIsInternal() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));

        service.runBestEffort(cycleId, "route-pools");

        // Machine-triggered work is attributed like the portal publish gate does it —
        // no synthetic system user is invented.
        verify(aggregationService).aggregate(cycleId, actor, "internal");
        verify(prioritizationService).prioritize(cycleId, actor, "internal");
    }

    @Test
    void aFlaggedDisagreementDoesNotStopPrioritisation() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));
        when(aggregationService.aggregate(cycleId, actor, "internal"))
                .thenReturn(new AggregationResponse(cycleId, UUID.randomUUID(),
                        AggregationStatus.REVIEW_REQUIRED, null, null, java.util.Map.of(), 5, true,
                        java.util.Map.of("spread", 55), null, EvaluationStatus.SCORES_AGGREGATED,
                        true, "Aggregated; flagged for review"));

        service.runBestEffort(cycleId, "analyze");

        verify(prioritizationService).prioritize(cycleId, actor, "internal");
    }

    // ------------------------------------------------------------------
    // the no-op guards
    // ------------------------------------------------------------------

    @Test
    void anIncompleteCycleIsLeftAlone() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_IN_PROGRESS)));

        service.runBestEffort(cycleId, "analyze");

        verifyNoInteractions(aggregationService, prioritizationService);
    }

    @Test
    void anAlreadyAggregatedCycleIsNotReClobbered() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.SCORES_AGGREGATED)));

        service.runBestEffort(cycleId, "submit");

        verifyNoInteractions(aggregationService, prioritizationService);
    }

    @Test
    void anUnknownCycleIsIgnored() {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        service.runBestEffort(cycleId, "analyze");

        verifyNoInteractions(aggregationService, prioritizationService);
    }

    @Test
    void aNullCycleIdIsIgnored() {
        service.runBestEffort(null, "analyze");

        verifyNoInteractions(cycleRepository, aggregationService, prioritizationService);
    }

    // ------------------------------------------------------------------
    // failure containment
    // ------------------------------------------------------------------

    @Test
    void anAggregationFailureIsSwallowedAndPrioritisationIsNotAttempted() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));
        when(aggregationService.aggregate(cycleId, actor, "internal"))
                .thenThrow(new ApiException(HttpStatus.CONFLICT, "no submitted scorecard"));

        assertThatCode(() -> service.runBestEffort(cycleId, "submit")).doesNotThrowAnyException();

        verify(prioritizationService, never()).prioritize(any(), any(), any());
    }

    @Test
    void aPrioritisationFailureIsSwallowedToo() {
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));
        when(prioritizationService.prioritize(cycleId, actor, "internal"))
                .thenThrow(new IllegalStateException("db down"));

        assertThatCode(() -> service.runBestEffort(cycleId, "submit")).doesNotThrowAnyException();

        // The aggregation it already committed stays committed — that is the point of
        // each step having its own transaction.
        verify(aggregationService).aggregate(cycleId, actor, "internal");
    }

    @Test
    void anUnexpectedCycleLookupFailureIsSwallowed() {
        when(cycleRepository.findById(cycleId)).thenThrow(new IllegalStateException("db down"));

        assertThatCode(() -> service.runBestEffort(cycleId, "analyze")).doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------
    // the by-assignment entry point
    // ------------------------------------------------------------------

    @Test
    void theAssignmentEntryPointResolvesTheCycleAndRunsTheSamePass() {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(assignmentId);
        assignment.setCycleId(cycleId);
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));

        service.runBestEffortForAssignment(assignmentId, "submit");

        var order = inOrder(aggregationService, prioritizationService);
        order.verify(aggregationService).aggregate(cycleId, actor, "internal");
        order.verify(prioritizationService).prioritize(cycleId, actor, "internal");
    }

    @Test
    void anUnknownAssignmentIsANoOp() {
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.empty());

        service.runBestEffortForAssignment(assignmentId, "submit");

        verifyNoInteractions(cycleRepository, aggregationService, prioritizationService);
    }

    @Test
    void aNullAssignmentIdIsIgnored() {
        service.runBestEffortForAssignment(null, "submit");

        verifyNoInteractions(assignmentRepository, aggregationService, prioritizationService);
    }

    @Test
    void theAssignmentEntryPointSwallowsFailuresLikeTheOther() {
        when(assignmentRepository.findById(assignmentId))
                .thenThrow(new IllegalStateException("db down"));

        assertThatCode(() -> service.runBestEffortForAssignment(assignmentId, "submit"))
                .doesNotThrowAnyException();
    }

    @Test
    void theAssignmentEntryPointStillRespectsTheStatusGuard() {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(assignmentId);
        assignment.setCycleId(cycleId);
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
        when(cycleRepository.findById(cycleId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_IN_PROGRESS)));

        service.runBestEffortForAssignment(assignmentId, "submit");

        verifyNoInteractions(aggregationService, prioritizationService);
    }
}
