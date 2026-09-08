package com.EDITH.SIH26043.enums;

/**
 * Lifecycle of a project submission on the portal.
 *
 * <ul>
 *   <li>{@code DRAFT} — being authored; files/meta editable.</li>
 *   <li>{@code SUBMITTED} — the artifact check passed and the round was pushed to
 *       evaluation-service (transient; the persisted status is UNDER_REVIEW).</li>
 *   <li>{@code UNDER_REVIEW} — a project-review work item is open with the
 *       evaluator who scored the problem.</li>
 *   <li>{@code ACCEPTED} — evaluator accepted the round.</li>
 *   <li>{@code RETURNED} — evaluator sent it back; the team may edit and
 *       resubmit, which starts a new review round.</li>
 * </ul>
 */
public enum SubmissionStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    ACCEPTED,
    RETURNED
}
