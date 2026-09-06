package com.EDITH.SIH26043.service.analysis;

import java.util.List;
import java.util.UUID;

/**
 * Immutable problem context assembled for the AI analysis step (and the
 * heuristic fallback). Never mutated by Phase 2.
 */
public record ProblemContext(
        UUID problemId,
        String title,
        String description,
        String sourceBucket,
        String subEntityType,
        String urgency,
        String severity,
        Integer affectedPopulation,
        String expectedOutcome,
        String existingIntervention,
        String location,
        List<String> domains,
        int evidenceCount
) {
}
