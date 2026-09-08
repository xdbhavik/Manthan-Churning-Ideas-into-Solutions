package com.EDITH.SIH26043.enums;

/**
 * Role of a participant within a {@code team}. Stored as a VARCHAR(20) string
 * column (not a native PG enum) because the set is tiny and portal-local.
 */
public enum TeamRole {
    LEADER,
    MEMBER
}
