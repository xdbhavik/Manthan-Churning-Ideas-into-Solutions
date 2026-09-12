package com.EDITH.SIH26043.service.analysis;

import java.util.Map;

/**
 * A complete machine scorecard for one pool, as returned by a
 * {@link CriterionScoringClient}.
 *
 * <p>The maps are keyed by {@code criterionKey} of the request's pool. A result
 * only reaches the caller when <em>every</em> requested criterion is present —
 * a partial answer is discarded rather than half-persisted, because the normal
 * scorecard validator requires each active criterion exactly once.</p>
 *
 * @param feedback       overall free-text assessment (stored on the assignment)
 * @param recommendation short verdict, e.g. "Prioritize for pilot"
 * @param provider       {@code openai-compatible} — mirrors
 *                       {@code problem_analysis.provider} so provenance is queryable
 * @param model          the model id that produced the scores
 */
public record CriterionScoringResult(
        Map<String, Integer> scoresByKey,
        Map<String, String> commentsByKey,
        String feedback,
        String recommendation,
        String provider,
        String model
) {
}
