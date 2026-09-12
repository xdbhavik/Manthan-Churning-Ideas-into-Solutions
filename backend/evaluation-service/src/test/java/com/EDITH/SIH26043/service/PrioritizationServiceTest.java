package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.ScoreAggregation;
import com.EDITH.SIH26043.enums.AggregationStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ImpactLevel;
import com.EDITH.SIH26043.enums.PriorityBand;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.ScoreAggregationRepository;
import com.EDITH.SIH26043.web.dto.PrioritizationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Banding the aggregated score and handing the cycle to phase 3.
 *
 * <p>Two things are load-bearing. First, {@code priority_score} must be the same
 * number as the aggregated {@code final_score} — nothing may add an urgency bonus,
 * so this suite pins that equality rather than merely checking a band. Second, the
 * band is a pure function of the score against inclusive descending thresholds,
 * which is only trustworthy if the exact-equality boundary is tested: 80.00 is P1
 * and 79.99 is P2, and an off-by-one here silently re-ranks problems.</p>
 */
class PrioritizationServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final ScoreAggregationRepository aggregationRepository =
            mock(ScoreAggregationRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);

    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();
    private final UUID actor = UUID.randomUUID();

    private EvaluationCycle cycle;
    private ScoreAggregation aggregation;

    private PrioritizationService service;

    @BeforeEach
    void setUp() {
        service = serviceWith(new BigDecimal("80"), new BigDecimal("65"), new BigDecimal("50"));

        cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(EvaluationStatus.SCORES_AGGREGATED);
        cycle.setImpactLevel(ImpactLevel.HIGH);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(cycleRepository.save(any(EvaluationCycle.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        aggregation = aggregation(new BigDecimal("80.00"));
        when(aggregationRepository.findByCycleId(cycleId)).thenReturn(Optional.of(aggregation));

        when(statusService.transition(eq(cycleId), any(EvaluationStatus.class), any(), anyString()))
                .thenAnswer(invocation -> {
                    cycle.setStatus(invocation.getArgument(1));
                    return cycle;
                });
    }

    private PrioritizationService serviceWith(BigDecimal p1, BigDecimal p2, BigDecimal p3) {
        return new PrioritizationService(cycleRepository, aggregationRepository, statusService,
                auditService, p1, p2, p3);
    }

    private static ScoreAggregation aggregation(BigDecimal overall) {
        ScoreAggregation row = new ScoreAggregation();
        row.setAggregationId(UUID.randomUUID());
        row.setOverallScore(overall);
        return row;
    }

    // ------------------------------------------------------------------
    // banding
    // ------------------------------------------------------------------

    @Test
    void theBandBoundariesAreInclusiveLowerBounds() {
        assertThat(bandFor("100.00")).isEqualTo(PriorityBand.P1);
        assertThat(bandFor("80.00")).isEqualTo(PriorityBand.P1);   // exactly P1
        assertThat(bandFor("79.99")).isEqualTo(PriorityBand.P2);
        assertThat(bandFor("65.00")).isEqualTo(PriorityBand.P2);   // exactly P2
        assertThat(bandFor("64.99")).isEqualTo(PriorityBand.P3);
        assertThat(bandFor("50.00")).isEqualTo(PriorityBand.P3);   // exactly P3
        assertThat(bandFor("49.99")).isEqualTo(PriorityBand.P4);
        assertThat(bandFor("0.00")).isEqualTo(PriorityBand.P4);
    }

    @Test
    void theBandThresholdsAreTunable() {
        PrioritizationService strict = serviceWith(new BigDecimal("95"), new BigDecimal("90"),
                new BigDecimal("85"));
        when(aggregationRepository.findByCycleId(cycleId))
                .thenReturn(Optional.of(aggregation(new BigDecimal("87.00"))));

        // 87 clears neither 95 nor 90, so it lands in the third band — under the shipped
        // thresholds it would have been P1.
        assertThat(strict.prioritize(cycleId, actor, "127.0.0.1").priorityBand())
                .isEqualTo(PriorityBand.P3);
    }

    @Test
    void priorityScoreIsTheAggregatedScoreWithNothingAdded() {
        when(aggregationRepository.findByCycleId(cycleId))
                .thenReturn(Optional.of(aggregation(new BigDecimal("72.50"))));

        PrioritizationResponse response = service.prioritize(cycleId, actor, "127.0.0.1");

        assertThat(response.priorityScore()).isEqualByComparingTo("72.50");
        assertThat(response.finalScore()).isEqualByComparingTo("72.50");
        assertThat(response.priorityScore()).isEqualByComparingTo(response.finalScore());
        assertThat(cycle.getFinalScore()).isEqualByComparingTo("72.50");
        assertThat(cycle.getPriorityScore()).isEqualByComparingTo("72.50");
        assertThat(cycle.getPriorityBand()).isEqualTo(PriorityBand.P2);
    }

    // ------------------------------------------------------------------
    // transitions
    // ------------------------------------------------------------------

    @Test
    void prioritisingTakesBothHopsInOrder() {
        service.prioritize(cycleId, actor, "127.0.0.1");

        var order = inOrder(statusService);
        order.verify(statusService).transition(cycleId, EvaluationStatus.PRIORITIZED, actor,
                "Priority P1 (score 80.00)");
        order.verify(statusService).transition(cycleId, EvaluationStatus.PHASE_3_READY, actor,
                "Prioritised; ready for phase 3");
        assertThat(cycle.getStatus()).isEqualTo(EvaluationStatus.PHASE_3_READY);
    }

    @Test
    void anAlreadyPrioritisedCycleOnlyTakesTheRemainingHop() {
        cycle.setStatus(EvaluationStatus.PRIORITIZED);

        service.prioritize(cycleId, actor, "127.0.0.1");

        verify(statusService, never()).transition(any(), eq(EvaluationStatus.PRIORITIZED), any(),
                anyString());
        verify(statusService).transition(cycleId, EvaluationStatus.PHASE_3_READY, actor,
                "Prioritised; ready for phase 3");
    }

    @Test
    void aCycleAlreadyAtPhaseThreeIsAPureRecompute() {
        cycle.setStatus(EvaluationStatus.PHASE_3_READY);

        PrioritizationResponse response = service.prioritize(cycleId, actor, "127.0.0.1");

        verify(statusService, never()).transition(any(), any(), any(), anyString());
        assertThat(response.priorityBand()).isEqualTo(PriorityBand.P1);
        assertThat(cycle.getPriorityBand()).isEqualTo(PriorityBand.P1);
    }

    @Test
    void theAuditRowCarriesTheCallerAsTheActor() {
        service.prioritize(cycleId, actor, "10.0.0.9");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> after = ArgumentCaptor.forClass(Map.class);
        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.EVALUATION_PRIORITIZED), eq(actor),
                eq(Map.of("status", "SCORES_AGGREGATED")), after.capture(), eq("10.0.0.9"));
        assertThat(after.getValue())
                .containsEntry("priorityBand", "P1")
                .containsEntry("priorityScore", new BigDecimal("80.00"))
                .containsEntry("reviewRequired", false)
                .containsEntry("status", "PHASE_3_READY");
    }

    // ------------------------------------------------------------------
    // the disagreement flag is not a gate
    // ------------------------------------------------------------------

    @Test
    void aFlaggedDisagreementStillReachesPhaseThree() {
        aggregation.setDisagreementFlag(true);
        aggregation.setStatus(AggregationStatus.REVIEW_REQUIRED);

        PrioritizationResponse response = service.prioritize(cycleId, actor, "127.0.0.1");

        assertThat(response.cycleStatus()).isEqualTo(EvaluationStatus.PHASE_3_READY);
        assertThat(response.reviewRequired()).isTrue();
        assertThat(response.message()).contains("flagged for review");
    }

    // ------------------------------------------------------------------
    // guards
    // ------------------------------------------------------------------

    @Test
    void aCycleThatHasNotBeenAggregatedIsAConflict() {
        cycle.setStatus(EvaluationStatus.EVALUATION_COMPLETED);

        assertThatThrownBy(() -> service.prioritize(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("only an aggregated cycle")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void aMissingAggregationRowIsAConflict() {
        when(aggregationRepository.findByCycleId(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.prioritize(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("no aggregation row")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void anAggregationWithoutAnOverallScoreIsAConflict() {
        when(aggregationRepository.findByCycleId(cycleId))
                .thenReturn(Optional.of(aggregation(null)));

        assertThatThrownBy(() -> service.prioritize(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("no overall score")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void anUnknownCycleIsNotFound() {
        UUID unknown = UUID.randomUUID();

        assertThatThrownBy(() -> service.prioritize(unknown, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    /** Runs one prioritisation and returns the band it produced. */
    private PriorityBand bandFor(String score) {
        when(aggregationRepository.findByCycleId(cycleId))
                .thenReturn(Optional.of(aggregation(new BigDecimal(score))));
        return service.prioritize(cycleId, actor, "127.0.0.1").priorityBand();
    }
}
