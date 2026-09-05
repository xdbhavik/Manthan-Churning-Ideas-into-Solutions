package com.EDITH.SIH26043.enums;

/**
 * Lifecycle of a source registration request (Phase 1).
 *
 * <p>Deliberately separate from {@link KycStatus}: KYC is the identity result,
 * this is the workflow state. A registration can be UNDER_REVIEW while its
 * owner's KYC is VERIFIED, or ACTION_REQUIRED while it is UNVERIFIED.</p>
 */
public enum RegistrationStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    APPROVED,
    REJECTED,
    ACTION_REQUIRED
}
