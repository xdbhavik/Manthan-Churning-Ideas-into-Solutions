package com.EDITH.SIH26043.enums;

/**
 * Lifecycle of a portal project submission inside evaluation-service. A review is
 * opened ASSIGNED against the evaluator who scored the problem's cycle; the
 * evaluator's decision lands ACCEPTED or RETURNED (both are also pushed back to
 * the portal submission).
 */
public enum ProjectReviewStatus {
    ASSIGNED,
    ACCEPTED,
    RETURNED
}
