package com.EDITH.SIH26043.internal;

import java.util.UUID;

/**
 * Service-to-service snapshot of a source account, served by source-service over
 * {@code GET /internal/source-accounts/{id}} and consumed by problem-service to
 * authorize problem submissions.
 *
 * <p>Enum-valued fields travel as their {@code name()} strings so the two
 * services never need to agree on a persisted representation. {@code canSubmit}
 * mirrors source-service's {@code SourceAccount.canSubmit()} (status ACTIVE and
 * verificationStatus VERIFIED) so problem-service does not re-implement the
 * policy.</p>
 *
 * @param status          one of the {@code SourceAccountStatus} names
 * @param verificationStatus one of the {@code AccountVerificationStatus} names
 * @param sourceBucket    one of the {@code SourceBucket} names
 * @param sourceType      one of the {@code SubEntityType} names
 */
public record SourceAccountResponse(
        UUID sourceAccountId,
        UUID ownerUserId,
        UUID sourceId,
        String status,
        String verificationStatus,
        String sourceBucket,
        String sourceType,
        String displayName,
        boolean canSubmit) {
}
