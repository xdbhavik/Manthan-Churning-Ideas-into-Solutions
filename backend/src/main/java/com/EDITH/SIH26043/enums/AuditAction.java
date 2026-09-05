package com.EDITH.SIH26043.enums;

/**
 * Action types recorded in the immutable audit trail.
 * Refs: 05-data-dictionary-common.md (sec 7).
 */
public enum AuditAction {
    CREATED,
    UPDATED,
    STATUS_CHANGED,
    EVIDENCE_ADDED,
    SOURCE_VERIFICATION_INITIATED,
    SOURCE_VERIFIED,
    SOURCE_VERIFICATION_FAILED,
    REJECTED,
    ARCHIVED,
    WITHDRAWN
}