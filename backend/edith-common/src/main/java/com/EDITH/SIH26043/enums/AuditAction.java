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
    WITHDRAWN,
    // Phase 2 evaluation engine
    EVALUATION_STARTED,
    EVALUATION_ANALYZED,
    EVALUATION_ROUTED,
    EVALUATION_ASSIGNED,
    EVALUATION_SUBMITTED,
    EVALUATION_AGGREGATED,
    EVALUATION_PRIORITIZED,
    EVALUATION_COMPLETED,
    EVALUATION_DISAGREEMENT_FLAGGED,
    EVALUATION_DISAGREEMENT_RESOLVED,
    EVALUATION_WEIGHT_UPDATED,
    // Phase 3 portal: problem published to the portal after EVALUATION_COMPLETED,
    // plus the project-review work items students' submissions create.
    PROBLEM_PUBLISHED,
    PROJECT_REVIEW_ASSIGNED,
    PROJECT_REVIEW_DECIDED
}