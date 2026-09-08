package com.EDITH.SIH26043.enums;

/**
 * Kind of portal participant. A UNIVERSITY participant is bound to a HEI
 * source account the caller owns (auto-created on first contact); a STUDENT
 * registers explicitly. Portal-local — deliberately not a {@link UserRole}
 * change: the shared claim JWT keeps the source-service role model untouched.
 */
public enum ParticipantType {
    STUDENT,
    UNIVERSITY
}
