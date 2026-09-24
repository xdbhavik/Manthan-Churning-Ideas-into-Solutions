package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read model of a published problem for catalog listings. Restricted problems
 * are already filtered by the caller's participant kind before this is built, so
 * a row here is always one the caller may see.
 */
public record PublishedProblemSummary(
        UUID problemId,
        String title,
        String expectedOutcome,
        String sourceBucket,
        String subEntityType,
        String urgency,
        String severity,
        String location,
        List<String> domains,
        int evidenceCount,
        String accessRule,
        Instant publishedAt,
        Integer velocityIndex,
        List<Integer> velocityHistory,
        Integer prizePool,
        Integer teamsActive
) {
}
