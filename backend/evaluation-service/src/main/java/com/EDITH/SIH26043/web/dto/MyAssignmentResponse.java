package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * One row of the evaluator's own work queue. Deliberately cheap: everything here
 * comes from this service's database, so listing a queue never depends on
 * problem-service being reachable. The problem's title/description arrive only
 * on the detail read ({@link AssignmentDetailResponse}).
 *
 * @param overdue        deadline already passed while still open — the next write
 *                       (accept/submit) will mark the assignment EXPIRED
 * @param criteriaTotal  active criteria of the evaluator's pool
 * @param criteriaScored how many of them already have a stored score
 */
public record MyAssignmentResponse(
        UUID assignmentId,
        UUID cycleId,
        UUID problemId,
        AssignmentStatus status,
        Instant assignedAt,
        Instant deadline,
        Instant submittedAt,
        boolean overdue,
        int criteriaTotal,
        int criteriaScored,
        EvaluationStatus cycleStatus,
        boolean directGovernmentDecision
) {

    /**
     * Same row with a corrected {@code criteriaScored}. The detail read already
     * knows how many <em>active</em> criteria carry a score, so it overrides the
     * list's raw response count (which would also count scores left behind by a
     * criterion that has since been deactivated).
     */
    public MyAssignmentResponse withCriteriaScored(int scored) {
        return new MyAssignmentResponse(assignmentId, cycleId, problemId, status,
                assignedAt, deadline, submittedAt, overdue, criteriaTotal, scored, cycleStatus,
                directGovernmentDecision);
    }
}
