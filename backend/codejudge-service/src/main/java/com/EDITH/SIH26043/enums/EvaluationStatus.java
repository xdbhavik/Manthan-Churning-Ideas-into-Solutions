package com.EDITH.SIH26043.enums;

/**
 * Lifecycle of one automated repository evaluation. Mirrors the pipeline in
 * codejudgeservice.md §6. A worker walks the statuses in order; any unrecoverable
 * stage failure moves the evaluation to {@link #FAILED} (which a reviewer can
 * {@code retry} into a fresh {@link #QUEUED} job).
 *
 * <p>Build/run/test execution statuses ({@code BUILDING}, {@code RUNNING},
 * {@code TESTING}) are members of the state machine but are only entered when
 * {@code app.codejudge.sandbox-enabled=true} — in the default deployment no
 * untrusted student code is executed and those stages are simply never entered.</p>
 */
public enum EvaluationStatus {
    SUBMITTED,
    QUEUED,
    CLONING,
    SCANNING,
    BUILDING,
    RUNNING,
    TESTING,
    SECURITY_SCANNING,
    ARCHITECTURE_ANALYSIS,
    REQUIREMENT_MATCHING,
    AI_ANALYSIS,
    SCORING,
    REPORT_GENERATION,
    COMPLETED,
    FAILED
}
