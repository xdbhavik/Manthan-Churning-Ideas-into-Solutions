package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.ScoreAggregation;
import com.EDITH.SIH26043.enums.AggregationStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.WeightingMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * The aggregation result: one weighted 0–100 score for the problem, the per-pool
 * snapshot it was computed from, and whether the pools disagreed.
 *
 * <p>{@code perTypeScores} always carries all five pools. A pool that never
 * produced a scorecard appears with {@code present: false} and a {@code reason},
 * so the reduced coverage behind a score is visible rather than implied.</p>
 */
public record AggregationResponse(
        UUID cycleId,
        UUID aggregationId,
        AggregationStatus status,
        BigDecimal overallScore,
        WeightingMethod weightingMethod,
        Map<String, Object> perTypeScores,
        int numAssignments,
        boolean disagreementFlag,
        Map<String, Object> disagreementDetails,
        Instant aggregatedAt,
        EvaluationStatus cycleStatus,
        boolean reviewRequired,
        String message
) {

    public static AggregationResponse from(ScoreAggregation aggregation, EvaluationCycle cycle,
                                           String message) {
        return new AggregationResponse(
                aggregation.getCycleId(),
                aggregation.getAggregationId(),
                aggregation.getStatus(),
                aggregation.getOverallScore(),
                aggregation.getWeightingMethod(),
                aggregation.getPerTypeScores(),
                aggregation.getNumAssignments() == null ? 0 : aggregation.getNumAssignments(),
                aggregation.isDisagreementFlag(),
                aggregation.getDisagreementDetails(),
                aggregation.getAggregatedAt(),
                cycle == null ? null : cycle.getStatus(),
                aggregation.getStatus() == AggregationStatus.REVIEW_REQUIRED,
                message);
    }
}
