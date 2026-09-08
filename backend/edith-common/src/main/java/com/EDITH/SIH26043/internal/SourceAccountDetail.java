package com.EDITH.SIH26043.internal;

import java.util.UUID;

/**
 * Service-to-service row of a source account owned by a user, served by
 * source-service over {@code GET /internal/users/{userId}/source-accounts} and
 * consumed by portal-service to decide whether a caller is a UNIVERSITY
 * participant and — for SELECTED_UNIVERSITIES problems — to match its
 * institution name against the problem's access snapshot.
 *
 * <p>A deliberately separate record from {@link SourceAccountResponse}: that one
 * is keyed by a single account id and its constructor is baked into
 * problem-service tests, so the university-relevant {@code institutionName} is
 * added here instead of widening the existing contract.</p>
 *
 * @param sourceBucket    one of the {@code SourceBucket} names (HEI ⇒ university)
 * @param sourceType      one of the {@code SubEntityType} names
 * @param status          one of the {@code SourceAccountStatus} names
 * @param verificationStatus one of the {@code AccountVerificationStatus} names
 * @param institutionName the HEI's canonical {@code institution_name} when the
 *                        materialized source is an {@code HEISource} (University /
 *                        Research Lab); null for every other source kind
 */
public record SourceAccountDetail(
        UUID sourceAccountId,
        UUID sourceId,
        String sourceBucket,
        String sourceType,
        String status,
        String verificationStatus,
        String institutionName,
        String displayName,
        boolean canSubmit) {
}
