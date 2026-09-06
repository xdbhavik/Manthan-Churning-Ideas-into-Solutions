package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Phase 2 intake (S2): only REGISTERED problems without an existing cycle may
 * enter evaluation; a successful start opens the cycle in RECEIVED with an
 * initial history row and an EVALUATION_STARTED audit entry.
 *
 * <p>Since the extraction the problem row lives in problem-service: the
 * eligibility check runs against the {@link ProblemContextGateway} snapshot
 * instead of a local {@code ProblemRepository}.</p>
 */
class EvaluationIntakeServiceTest {

    private final ProblemContextGateway problemGateway = mock(ProblemContextGateway.class);
    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluationStatusHistoryRepository historyRepository =
            mock(EvaluationStatusHistoryRepository.class);
    private final AuditService auditService = mock(AuditService.class);

    private final EvaluationIntakeService service = new EvaluationIntakeService(
            problemGateway, cycleRepository, historyRepository, auditService);

    private final UUID actor = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    @Test
    void unknownProblemIsNotFound() {
        when(problemGateway.fetch(problemId))
                .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "Problem " + problemId + " not found"));

        assertThatThrownBy(() -> service.start(problemId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);

        verifyNoInteractions(cycleRepository, historyRepository, auditService);
    }

    @Test
    void nonRegisteredProblemIsRejected() {
        when(problemGateway.fetch(problemId)).thenReturn(problem("SUBMITTED"));

        assertThatThrownBy(() -> service.start(problemId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("INVALID_PROBLEM_STATUS")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(cycleRepository, historyRepository, auditService);
    }

    @Test
    void duplicateCycleIsConflict() {
        when(problemGateway.fetch(problemId)).thenReturn(problem("REGISTERED"));
        when(cycleRepository.existsByProblemId(problemId)).thenReturn(true);

        assertThatThrownBy(() -> service.start(problemId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("DUPLICATE_EVALUATION")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(cycleRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void successCreatesCycleInReceivedWithHistoryAndAudit() {
        when(problemGateway.fetch(problemId)).thenReturn(problem("REGISTERED"));
        when(cycleRepository.existsByProblemId(problemId)).thenReturn(false);

        EvaluationCycle cycle = service.start(problemId, actor, "127.0.0.1");

        assertThat(cycle.getProblemId()).isEqualTo(problemId);
        assertThat(cycle.getStatus()).isEqualTo(EvaluationStatus.RECEIVED);
        assertThat(cycle.getTriggerMethod()).isEqualTo("ADMIN");
        assertThat(cycle.getTriggeredByUserId()).isEqualTo(actor);

        ArgumentCaptor<EvaluationStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(EvaluationStatusHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        EvaluationStatusHistory history = historyCaptor.getValue();
        assertThat(history.getCycleId()).isEqualTo(cycle.getCycleId());
        assertThat(history.getToStatus()).isEqualTo(EvaluationStatus.RECEIVED);

        verify(auditService).record(eq("PROBLEM"), eq(problemId), eq(AuditAction.EVALUATION_STARTED),
                eq(actor), isNull(), anyMap(), eq("127.0.0.1"));
    }

    private static ProblemContextResponse problem(String status) {
        return new ProblemContextResponse(UUID.randomUUID(), status, "title", "desc",
                null, null, null, null, null, null, null, null, List.of(), 0);
    }
}
