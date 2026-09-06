package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight public view of a registration's current status.
 * Used by GET /registration/{id}/status — no auth required, so this
 * deliberately omits the full source payload and internal fields.
 */
public record RegistrationStatusResponse(
        UUID registrationId,
        SourceBucket sourceBucket,
        SubEntityType sourceType,
        RegistrationStatus status,
        String rejectionReason,
        String actionRequiredComment,
        Instant submittedAt,
        Instant reviewedAt,
        Instant createdAt
) {
    public static RegistrationStatusResponse from(SourceRegistration r) {
        return new RegistrationStatusResponse(
                r.getRegistrationId(),
                r.getSourceBucket(),
                r.getSourceType(),
                r.getStatus(),
                r.getRejectionReason(),
                r.getActionRequiredComment(),
                r.getSubmittedAt(),
                r.getReviewedAt(),
                r.getCreatedAt()
        );
    }
}
