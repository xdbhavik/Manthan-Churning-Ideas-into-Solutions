package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full read model of a single published problem statement. Contains the
 * description and the access-university snapshot alongside the summary fields.
 */
public record PublishedProblemDetail(
        UUID problemId,
        String title,
        String description,
        String expectedOutcome,
        String sourceBucket,
        String subEntityType,
        String urgency,
        String severity,
        String location,
        List<String> domains,
        int evidenceCount,
        String accessRule,
        List<String> accessUniversities,
        Instant publishedAt,
        Integer velocityIndex,
        List<Integer> velocityHistory,
        Integer prizePool,
        Integer teamsActive
) {
}
