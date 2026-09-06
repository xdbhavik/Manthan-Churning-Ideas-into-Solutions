package com.EDITH.SIH26043.enums;

/**
 * Outcome of the AI problem-analysis step.
 * {@code HEURISTIC_FALLBACK} = deterministic classifier used after the LLM
 * call failed or no API key is configured.
 */
public enum AnalysisStatus {
    SUCCESS,
    FAILED,
    HEURISTIC_FALLBACK
}
