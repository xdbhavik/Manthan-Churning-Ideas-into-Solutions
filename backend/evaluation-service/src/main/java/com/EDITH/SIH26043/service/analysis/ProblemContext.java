package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.internal.ProblemContextResponse;

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

    /**
     * Projects the cross-service problem snapshot onto the (smaller, AI-facing)
     * context. Shared by the analysis step and the AUTO scoring step so both
     * models see exactly the same view of a problem.
     */
    public static ProblemContext from(ProblemContextResponse p) {
        return new ProblemContext(
                p.problemId(), p.title(), p.description(),
                p.sourceBucket(), p.subEntityType(), p.urgency(), p.severity(),
                p.affectedPopulation(), p.expectedOutcome(), p.existingIntervention(),
                p.location(), p.domains(), p.evidenceCount());
    }
}
