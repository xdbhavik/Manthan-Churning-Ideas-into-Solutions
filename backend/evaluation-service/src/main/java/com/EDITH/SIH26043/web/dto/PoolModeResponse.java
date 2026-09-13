package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluatorPoolMode;
import com.EDITH.SIH26043.enums.EvaluationMode;
import com.EDITH.SIH26043.enums.EvaluatorType;

import java.time.Instant;
import java.util.UUID;

/**
 * One pool's MANUAL/AUTO switch, as shown to the evaluator who owns it (or an
 * ADMIN).
 *
 * <p>{@code aiScoringAvailable} and {@code activeHumanEvaluators} are the two
 * hints that make flipping the switch an informed decision: an AUTO pool with no
 * usable model will quietly degrade to a human, and a MANUAL pool with nobody
 * active will be skipped. {@code note} spells that out in words.</p>
 */
public record PoolModeResponse(
        String evaluatorType,
        String mode,
        UUID updatedByUserId,
        Instant updatedAt,
        boolean aiScoringAvailable,
        int activeHumanEvaluators,
        String note
) {

    /**
     * @param row the stored switch row, or {@code null} when the pool has no row
     *            yet (which reads as MANUAL)
     */
    public static PoolModeResponse of(EvaluatorType pool, EvaluationMode mode, EvaluatorPoolMode row,
                                      boolean aiScoringAvailable, int activeHumanEvaluators,
                                      String note) {
        return new PoolModeResponse(
                pool.name(),
                mode.name(),
                row == null ? null : row.getUpdatedByUserId(),
                row == null ? null : row.getUpdatedAt(),
                aiScoringAvailable,
                activeHumanEvaluators,
                note);
    }
}
