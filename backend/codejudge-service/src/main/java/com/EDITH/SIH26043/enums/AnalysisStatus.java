package com.EDITH.SIH26043.enums;

/**
 * How a {@code code_analysis} evidence row was produced. The agentic-legibility
 * analyzer is the primary tool; when it is unavailable the pipeline falls back to
 * the built-in heuristic marker so the engineering categories are never silently
 * empty.
 */
public enum AnalysisStatus {
    SUCCESS,
    HEURISTIC_FALLBACK,
    FAILED,
    SKIPPED,
    UNAVAILABLE
}
