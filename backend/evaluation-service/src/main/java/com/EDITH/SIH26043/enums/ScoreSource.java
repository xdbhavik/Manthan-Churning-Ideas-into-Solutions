package com.EDITH.SIH26043.enums;

/**
 * Who produced a single {@code evaluation_response} row.
 *
 * <p>The evidence is recorded per score row rather than per assignment so an AI
 * scorecard is honestly distinguishable in any aggregation or report, and so a
 * later manual correction can coexist with the machine's original numbers. The
 * precedent is {@code problem_analysis.provider}/{@code model}.</p>
 *
 * <p>Also carried on the assignment's audit trail: the AI submit writes its own
 * {@code EVALUATION_AI_SCORED} row naming pool, provider and model.</p>
 */
public enum ScoreSource {
    HUMAN,
    AI
}
