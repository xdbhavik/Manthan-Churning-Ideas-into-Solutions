package com.EDITH.SIH26043.enums;

/**
 * Who is allowed to see / work on a problem statement.
 *
 * <ul>
 *   <li>{@code OPEN_TO_ALL} — every university and student can access it.</li>
 *   <li>{@code UNIVERSITY_ONLY} — only university participants (any university).</li>
 *   <li>{@code SELECTED_UNIVERSITIES} — only the universities explicitly named on
 *       the problem ({@code problem.access_universities}).</li>
 *   <li>{@code AUTO_SELECTED_UNIVERSITIES} — the submitter names no university; the
 *       platform derives the problem's domains and resolves the matching
 *       universities itself. The resolved names are snapshotted into
 *       {@code problem.access_universities} exactly as for
 *       {@code SELECTED_UNIVERSITIES}, so downstream consumers read the audience
 *       the same way. Resolution is fail-closed: if it cannot be performed the
 *       submission is rejected rather than widened.</li>
 * </ul>
 */
public enum ProblemAccessRule {
    OPEN_TO_ALL,
    UNIVERSITY_ONLY,
    SELECTED_UNIVERSITIES,
    AUTO_SELECTED_UNIVERSITIES
}
