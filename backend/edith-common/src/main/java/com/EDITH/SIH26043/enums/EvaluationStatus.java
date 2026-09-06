package com.EDITH.SIH26043.enums;

/**
 * Lifecycle of an {@code evaluation_cycle} row (Phase 2 state machine).
 * Transition rules live in {@code EvaluationStatusService}.
 */
public enum EvaluationStatus {
    RECEIVED,
    ANALYZING,
    ROUTING,
    EVALUATION_IN_PROGRESS,
    EVALUATION_COMPLETED,
    SCORES_AGGREGATED,
    PRIORITIZED,
    PHASE_3_READY,
    ANALYSIS_FAILED
}
