package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Result of an evaluator action on their own assignment (accept / decline /
 * submit). {@code cycleStatus} is the cycle's status <em>after</em> the action,
 * so a caller sees the knock-on transition immediately: the last submit of a
 * cycle moves it to EVALUATION_COMPLETED, and a decline that leaves no open
 * assignment reopens it for ROUTING.
 */
public record AssignmentOutcomeResponse(
        UUID assignmentId,
        AssignmentStatus status,
        Instant submittedAt,
        int criteriaScored,
        EvaluationStatus cycleStatus,
        String message
) {
}
