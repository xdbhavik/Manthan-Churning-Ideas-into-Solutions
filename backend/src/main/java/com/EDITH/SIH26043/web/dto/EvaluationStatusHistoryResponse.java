package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;

import java.time.Instant;
import java.util.UUID;

/** Append-only cycle transition record used in admin cycle views. */
public record EvaluationStatusHistoryResponse(
        UUID historyId,
        UUID cycleId,
        EvaluationStatus fromStatus,
        EvaluationStatus toStatus,
        UUID changedByUserId,
        String comment,
        Instant changedAt
) {

    public static EvaluationStatusHistoryResponse from(EvaluationStatusHistory h) {
        return new EvaluationStatusHistoryResponse(
                h.getHistoryId(), h.getCycleId(), h.getFromStatus(), h.getToStatus(),
                h.getChangedByUserId(), h.getComment(), h.getChangedAt());
    }
}
