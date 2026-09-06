package com.EDITH.SIH26043.enums;

/**
 * Lifecycle status of a submitted problem (Phase 1 boundary: ends at REGISTERED).
 * Refs: 05-data-dictionary-common.md, 11-api-and-indexes.md (transition rules).
 */
public enum ProblemStatus {
    SUBMITTED,
    SOURCE_VERIFYING,
    SOURCE_VERIFIED,
    REGISTERED,
    REJECTED,
    ARCHIVED
}