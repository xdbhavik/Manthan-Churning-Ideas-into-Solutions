package com.EDITH.SIH26043.enums;

/**
 * Who is allowed to see / work on a problem statement.
 *
 * <ul>
 *   <li>{@code OPEN_TO_ALL} — every university and student can access it.</li>
 *   <li>{@code UNIVERSITY_ONLY} — only university participants (any university).</li>
 *   <li>{@code SELECTED_UNIVERSITIES} — only the universities explicitly named on
 *       the problem ({@code problem.access_universities}).</li>
 * </ul>
 */
public enum ProblemAccessRule {
    OPEN_TO_ALL,
    UNIVERSITY_ONLY,
    SELECTED_UNIVERSITIES
}
