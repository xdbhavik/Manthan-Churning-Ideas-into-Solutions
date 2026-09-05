package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record RegistrationResponse(
        UUID registrationId,
        SourceBucket sourceBucket,
        SubEntityType sourceType,
        RegistrationStatus status,
        Map<String, Object> sourcePayload,
        UUID submittedByUserId,
        UUID sourceId,
        UUID assignedReviewerId,
        String rejectionReason,
        String actionRequiredComment,
        Instant submittedAt,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt,
        int version
) {

    public static RegistrationResponse from(SourceRegistration r) {
        return new RegistrationResponse(
                r.getRegistrationId(),
                r.getSourceBucket(),
                r.getSourceType(),
                r.getStatus(),
                r.getSourcePayload(),
                r.getSubmittedByUserId(),
                r.getSourceId(),
                r.getAssignedReviewerId(),
                r.getRejectionReason(),
                r.getActionRequiredComment(),
                r.getSubmittedAt(),
                r.getReviewedAt(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                r.getVersion() == null ? 1 : r.getVersion());
    }
}
