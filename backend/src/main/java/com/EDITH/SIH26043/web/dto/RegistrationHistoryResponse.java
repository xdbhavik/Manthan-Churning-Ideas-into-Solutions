package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.RegistrationStatusHistory;
import com.EDITH.SIH26043.enums.RegistrationStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** GET /registration/{id}/history payload: immutable decision trail. */
public record RegistrationHistoryResponse(
        UUID historyId,
        RegistrationStatus fromStatus,
        RegistrationStatus toStatus,
        UUID changedByUserId,
        String comment,
        Instant changedAt
) {

    public static RegistrationHistoryResponse from(RegistrationStatusHistory h) {
        return new RegistrationHistoryResponse(
                h.getHistoryId(),
                h.getFromStatus(),
                h.getToStatus(),
                h.getChangedByUserId(),
                h.getComment(),
                h.getChangedAt());
    }

    public static List<RegistrationHistoryResponse> from(List<RegistrationStatusHistory> rows) {
        return rows.stream().map(RegistrationHistoryResponse::from).toList();
    }
}
