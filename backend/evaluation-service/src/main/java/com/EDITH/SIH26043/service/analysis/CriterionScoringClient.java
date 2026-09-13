package com.EDITH.SIH26043.service.analysis;

import java.util.Optional;

/**
 * Scores one pool's criteria from the problem context.
 *
 * <p>A separate contract from {@link ProblemAnalysisClient} on purpose: that
 * client's prompt explicitly forbids scoring ("You MUST NOT score, rank, or
 * recommend any evaluation score") because its output is advisory-only input to
 * the human evaluator. Auto-evaluation needs the opposite behaviour, so it gets
 * its own prompt and its own client rather than bending that contract.</p>
 *
 * <p>Never throws: any failure — no API key, HTTP error, unusable JSON, a
 * missing or out-of-range criterion — is reported as {@link Optional#empty()},
 * and the caller degrades that pool to MANUAL instead of blocking the cycle.
 * Mirrors {@link ProblemAnalysisClient#analyze}.</p>
 */
public interface CriterionScoringClient {

    /**
     * @return a complete scorecard covering every criterion of the request, or
     *         empty when the model is unavailable/unusable for any reason
     */
    Optional<CriterionScoringResult> score(CriterionScoringRequest request);

    /**
     * Whether the model is configured well enough to be attempted at all (an API
     * key is present). Used only to report availability when a pool's switch is
     * being flipped — a configured model may still fail at call time.
     */
    boolean configured();
}
