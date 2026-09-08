package com.EDITH.SIH26043.internal;

import java.util.List;
import java.util.UUID;

/**
 * Service-to-service snapshot of a problem, served by problem-service over
 * {@code GET /internal/problems/{id}} and consumed by evaluation-service.
 *
 * <p>Carries everything the evaluation pipeline needs without a shared database:
 * the {@code status} (intake validates REGISTERED) plus the full AI-analysis
 * context (title/description/bucket + formatted location + domain names +
 * evidence count). Enum-valued fields travel as their {@code name()} strings so
 * the two services never need to agree on a persisted representation.</p>
 *
 * @param status one of the {@code ProblemStatus} names, e.g. {@code REGISTERED}
 * @param accessRule one of the {@code ProblemAccessRule} names, e.g.
 *                   {@code OPEN_TO_ALL}; who may access/work on this problem statement
 * @param accessUniversities university-name snapshot allowed to work on the problem;
 *                           populated only when {@code accessRule == SELECTED_UNIVERSITIES}
 */
public record ProblemContextResponse(
        UUID problemId,
        String status,
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
        int evidenceCount,
        String accessRule,
        List<String> accessUniversities) {
}
