package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.enums.AccountVerificationStatus;
import com.EDITH.SIH26043.enums.SourceAccountStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;

import java.time.Instant;
import java.util.UUID;

/**
 * A source account as seen by its owner. {@code canSubmit} is the same predicate
 * POST /problems enforces, so a client can disable the submit action instead of
 * discovering the 403 the hard way.
 */
public record SourceAccountResponse(
        UUID sourceAccountId,
        UUID sourceId,
        UUID registrationId,
        SourceBucket sourceBucket,
        SubEntityType sourceType,
        String displayName,
        SourceAccountStatus status,
        AccountVerificationStatus verificationStatus,
        boolean canSubmit,
        Instant activatedAt,
        Instant createdAt
) {

    public static SourceAccountResponse from(SourceAccount a) {
        return new SourceAccountResponse(
                a.getSourceAccountId(), a.getSourceId(), a.getRegistrationId(),
                a.getSourceBucket(), a.getSourceType(), a.getDisplayName(),
                a.getStatus(), a.getVerificationStatus(), a.canSubmit(),
                a.getActivatedAt(), a.getCreatedAt());
    }
}
