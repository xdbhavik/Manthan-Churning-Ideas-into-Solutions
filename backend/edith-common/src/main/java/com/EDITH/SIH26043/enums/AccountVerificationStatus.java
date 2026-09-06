package com.EDITH.SIH26043.enums;

/**
 * Identity-verification result carried by a source account (Phase 1).
 *
 * <p>Set to VERIFIED exactly once, when a reviewer approves the registration
 * that produced the account. REVOKED is the terminal state for a verification
 * that was later found invalid; it is never silently downgraded to UNVERIFIED.</p>
 */
public enum AccountVerificationStatus {
    UNVERIFIED,
    VERIFIED,
    REVOKED
}
