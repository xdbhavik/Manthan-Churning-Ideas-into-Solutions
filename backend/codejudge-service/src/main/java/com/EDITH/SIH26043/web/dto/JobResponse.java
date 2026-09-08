package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationJob;
import com.EDITH.SIH26043.enums.JobStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Queue visibility row for the admin surface.
 */
public record JobResponse(UUID jobId,
                          UUID evaluationId,
                          JobStatus status,
                          int priority,
                          String claimOwner,
                          Instant claimedAt,
                          int attempts,
                          String lastError,
                          Instant createdAt) {

    public static JobResponse from(EvaluationJob job) {
        return new JobResponse(job.getJobId(), job.getEvaluationId(), job.getStatus(),
                job.getPriority(), job.getClaimOwner(), job.getClaimedAt(),
                job.getAttempts(), job.getLastError(), job.getCreatedAt());
    }
}
