package com.EDITH.SIH26043.enums;

/**
 * Operational state of a source account (Phase 1).
 *
 * <p>Separate from {@link AccountVerificationStatus}: this is whether the
 * account may act right now, that is whether its identity proof still holds.
 * An account can be SUSPENDED while VERIFIED (admin hold on a genuine ULB) or
 * ACTIVE while UNVERIFIED only during backfill of pre-spine data.</p>
 */
public enum SourceAccountStatus {
    PENDING,
    ACTIVE,
    SUSPENDED
}
