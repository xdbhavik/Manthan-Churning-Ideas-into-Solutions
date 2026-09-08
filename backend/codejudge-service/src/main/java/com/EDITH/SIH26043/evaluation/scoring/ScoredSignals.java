package com.EDITH.SIH26043.evaluation.scoring;

/**
 * Result of applying the deterministic signal rubric to one agentic-legibility
 * category: a raw score out of the analyzer's own {@code maxScore}, plus the
 * counts behind it so the mark is auditable.
 *
 * @param score     awarded points (0..maxScore)
 * @param maxScore  the analyzer category maximum
 * @param satisfied signal keys that tested true
 * @param total     signal keys considered by the rubric
 */
public record ScoredSignals(double score, double maxScore, int satisfied, int total) {
}
