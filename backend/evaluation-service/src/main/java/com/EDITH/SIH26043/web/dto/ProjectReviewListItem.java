package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * One row of the evaluator's project-review queue: which submitted project needs
 * their ACCEPT / RETURN decision, and when it arrived.
 */
public record ProjectReviewListItem(
        UUID projectReviewId,
        UUID problemId,
        String problemTitle,
        String submissionTitle,
        Integer round,
        String status,
        Instant createdAt,
        Instant decidedAt
) {
}
