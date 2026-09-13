package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.EvaluatorType;

import java.util.List;

/**
 * Everything the scoring model needs to fill one pool's scorecard: the problem
 * itself, the advisory profile the (separate) analysis step produced, and the
 * pool's criterion catalog.
 *
 * <p>Deliberately a plain record, like {@link ProblemContext} — the scoring
 * client never sees a JPA entity, and the caller (not the client) decides which
 * fields of the analysis profile are worth sending.</p>
 *
 * @param pool     the pool whose criteria are being scored (also tells the model
 *                 which expert lens to adopt)
 * @param criteria the pool's active criteria, in display order
 * @param advisory the persisted advisory analysis profile, or {@code null} when
 *                 the analysis step has not run
 */
public record CriterionScoringRequest(
        EvaluatorType pool,
        ProblemContext problem,
        List<CriterionSpec> criteria,
        AdvisoryProfile advisory
) {

    /** One criterion of the pool, as presented to the model. */
    public record CriterionSpec(
            String criterionKey,
            String criterionLabel,
            String description,
            int maxScore
    ) {
    }

    /**
     * The advisory problem profile (never a score — see
     * {@code OpenAiCompatibleAnalysisClient}) reused as context for scoring.
     */
    public record AdvisoryProfile(
            String problemCategory,
            String domain,
            String sector,
            List<String> impactAreas,
            String complexity,
            String potentialScale,
            String technologyRelevance,
            String socialImpact
    ) {
    }
}
