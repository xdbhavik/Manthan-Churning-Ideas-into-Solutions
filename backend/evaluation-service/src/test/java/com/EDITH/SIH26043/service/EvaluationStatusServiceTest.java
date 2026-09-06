package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cycle state machine (S2): forward-only transitions, self-transition and
 * illegal-transition rejection, and an append-only history row per transition.
 */
class EvaluationStatusServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluationStatusHistoryRepository historyRepository =
            mock(EvaluationStatusHistoryRepository.class);

    private final EvaluationStatusService service = new EvaluationStatusService(
            cycleRepository, historyRepository);

    private final UUID actor = UUID.randomUUID();

    @Test
    void legalTransitionAdvancesStatusAndAppendsHistory() {
        UUID cycleId = UUID.randomUUID();
        EvaluationCycle cycle = cycle(EvaluationStatus.RECEIVED);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        EvaluationCycle result = service.transition(cycleId, EvaluationStatus.ANALYZING, actor, "go");

        assertThat(result.getStatus()).isEqualTo(EvaluationStatus.ANALYZING);
        ArgumentCaptor<EvaluationStatusHistory> captor =
                ArgumentCaptor.forClass(EvaluationStatusHistory.class);
        verify(historyRepository).save(captor.capture());
        EvaluationStatusHistory history = captor.getValue();
        assertThat(history.getCycleId()).isEqualTo(cycleId);
        assertThat(history.getFromStatus()).isEqualTo(EvaluationStatus.RECEIVED);
        assertThat(history.getToStatus()).isEqualTo(EvaluationStatus.ANALYZING);
        assertThat(history.getChangedByUserId()).isEqualTo(actor);
        assertThat(history.getComment()).isEqualTo("go");
    }

    @Test
    void selfTransitionIsRejected() {
        UUID cycleId = UUID.randomUUID();
        EvaluationCycle cycle = cycle(EvaluationStatus.ANALYZING);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.transition(cycleId, EvaluationStatus.ANALYZING, actor, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Already in status");

        verify(cycleRepository, never()).save(cycle);
        verify(historyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void illegalTransitionIsRejected() {
        UUID cycleId = UUID.randomUUID();
        EvaluationCycle cycle = cycle(EvaluationStatus.RECEIVED);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        // RECEIVED -> EVALUATION_IN_PROGRESS skips ANALYZING/ROUTING.
        assertThatThrownBy(() -> service.transition(
                cycleId, EvaluationStatus.EVALUATION_IN_PROGRESS, actor, null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(cycleRepository, never()).save(cycle);
    }

    @Test
    void unknownCycleIsNotFound() {
        UUID cycleId = UUID.randomUUID();
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.transition(cycleId, EvaluationStatus.ANALYZING, actor, null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void completedCyclesAreTerminal() {
        UUID cycleId = UUID.randomUUID();
        EvaluationCycle cycle = cycle(EvaluationStatus.PHASE_3_READY);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.transition(
                cycleId, EvaluationStatus.ANALYZING, actor, null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private static EvaluationCycle cycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(UUID.randomUUID());
        cycle.setProblemId(UUID.randomUUID());
        cycle.setStatus(status);
        return cycle;
    }
}
