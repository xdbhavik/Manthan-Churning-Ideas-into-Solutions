package com.EDITH.SIH26043.enums;

/**
 * Report verdict band. Determined deterministically from the final weighted
 * score ({@code >=80} EXCELLENT, {@code >=60} GOOD, otherwise NEEDS_WORK), or
 * {@code BLOCKED} when a CRITICAL security finding trips the configured
 * {@code CRITICAL_SECURITY_BLOCK} policy. The verdict is advisory to the human
 * reviewer — CodeJudge never accepts/returns a project.
 */
public enum Verdict {
    EXCELLENT,
    GOOD,
    NEEDS_WORK,
    BLOCKED
}
