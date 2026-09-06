package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ImpactLevel;
import com.EDITH.SIH26043.enums.PriorityBand;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Public view of an evaluation cycle (mirrors {@code EvaluationCycle}). */
public record EvaluationCycleResponse(
        UUID cycleId,
        UUID problemId,
        EvaluationStatus status,
        String triggerMethod,
        UUID triggeredByUserId,
        Instant startedAt,
        Instant completedAt,
        BigDecimal finalScore,
        ImpactLevel impactLevel,
        BigDecimal priorityScore,
        PriorityBand priorityBand,
        Instant createdAt,
        Instant updatedAt,
        int version
) {

    public static EvaluationCycleResponse from(EvaluationCycle c) {
        return new EvaluationCycleResponse(
                c.getCycleId(), c.getProblemId(), c.getStatus(), c.getTriggerMethod(),
                c.getTriggeredByUserId(), c.getStartedAt(), c.getCompletedAt(),
                c.getFinalScore(), c.getImpactLevel(), c.getPriorityScore(), c.getPriorityBand(),
                c.getCreatedAt(), c.getUpdatedAt(),
                c.getVersion() == null ? 1 : c.getVersion());
    }
}
