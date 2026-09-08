package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.PortalGateway;
import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Publishing a fully-evaluated problem to the portal. The automatic path (fired
 * from the submit controller after the scorecard commits) swallows nothing itself
 * — it is best effort at the controller — while the manual retry lets an
 * ADMIN/REVIEWER surface a portal outage. The gate in both paths is the same: a
 * cycle is publishable only after it has actually completed.
 */
class PortalPublishServiceTest {

    private final EvaluationAssignmentRepository assignmentRepository =
            mock(EvaluationAssignmentRepository.class);
    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final ProblemContextGateway problemGateway = mock(ProblemContextGateway.class);
    private final PortalGateway portalGateway = mock(PortalGateway.class);
    private final AuditService auditService = mock(AuditService.class);

    private final PortalPublishService service = new PortalPublishService(
            assignmentRepository, cycleRepository, problemGateway, portalGateway, auditService);

    private final UUID assignmentId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();
    private final UUID triggeredBy = UUID.randomUUID();

    @Test
    void assignmentPath_PublishesACompletedCycle() {
        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(assignment()));
        givenCycle(EvaluationStatus.EVALUATION_COMPLETED);
        ProblemContextResponse snapshot = snapshot();
        when(problemGateway.fetch(problemId)).thenReturn(snapshot);

        service.publishCompletedCycleByAssignment(assignmentId);

        verify(portalGateway).publish(cycleId, snapshot);
        verify(auditService).record(eq("PROBLEM"), eq(problemId), eq(AuditAction.PROBLEM_PUBLISHED),
                eq(triggeredBy), anyMap(), anyMap(), eq("internal"));
    }

    @Test
    void assignmentPath_SkipsSilentlyWhenTheAssignmentIsGone() {
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.empty());

        service.publishCompletedCycleByAssignment(assignmentId);

        verify(cycleRepository, never()).findById(any());
        verify(portalGateway, never()).publish(any(), any());
    }

    @Test
    void cyclePath_RefusesACycleThatHasNotCompleted() {
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);

        assertThatThrownBy(() -> service.publishCompletedCycle(cycleId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("completed");
                });
        verify(portalGateway, never()).publish(any(), any());
    }

    @Test
    void cyclePath_ThrowsWhenTheCycleIsUnknown() {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.publishCompletedCycle(cycleId))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void manualRetry_SurfacesAPortalOutageToTheCaller() {
        givenCycle(EvaluationStatus.EVALUATION_COMPLETED);
        ProblemContextResponse snapshot = snapshot();
        when(problemGateway.fetch(problemId)).thenReturn(snapshot);
        org.mockito.Mockito.doThrow(new ApiException(HttpStatus.BAD_GATEWAY, "portal down"))
                .when(portalGateway).publish(cycleId, snapshot);

        assertThatThrownBy(() -> service.publishCompletedCycle(cycleId))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
        verify(auditService, never()).record(any(), any(), any(), any(), anyMap(), anyMap(), any());
    }

    @Test
    void manualRetry_PublishesAndAuditsOnSuccess() {
        givenCycle(EvaluationStatus.PHASE_3_READY);
        ProblemContextResponse snapshot = snapshot();
        when(problemGateway.fetch(problemId)).thenReturn(snapshot);

        service.publishCompletedCycle(cycleId);

        verify(portalGateway).publish(cycleId, snapshot);
        verify(auditService).record(eq("PROBLEM"), eq(problemId), eq(AuditAction.PROBLEM_PUBLISHED),
                eq(triggeredBy), anyMap(), anyMap(), eq("internal"));
    }

    // ------------------------------------------------------------------ fixtures

    private EvaluationAssignment assignment() {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(assignmentId);
        assignment.setCycleId(cycleId);
        return assignment;
    }

    private void givenCycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(status);
        cycle.setTriggeredByUserId(triggeredBy);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
    }

    private ProblemContextResponse snapshot() {
        return new ProblemContextResponse(
                problemId, "EVALUATION_COMPLETED", "Irregular drinking water supply",
                "Hand pumps dry during summer.", "GOVT", null, null, null, null,
                null, null, null, java.util.List.of(), 0, null, java.util.List.of());
    }
}
