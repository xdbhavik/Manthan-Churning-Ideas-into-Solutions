package com.EDITH.SIH26043.enums;

/**
 * State of a DB-backed queue row in {@code evaluation_job}. Rows are claimed
 * atomically (optimistic {@code @Version}) so multiple worker replicas can poll
 * safely; a stale {@code CLAIMED} row (claim older than the reclaim timeout) can
 * be put back to {@code QUEUED} by any worker.
 */
public enum JobStatus {
    QUEUED,
    CLAIMED,
    DONE,
    FAILED
}
