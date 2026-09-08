package com.EDITH.SIH26043.evaluation.evidence;

import java.util.Map;

/**
 * Result of invoking the external Python agentic-legibility analyzer.
 *
 * @param available          true when the analyzer ran and its JSON parsed
 * @param error              human-readable reason when {@code available} is false
 * @param signalsByCategory  analyzer category key -> raw signals map (from the
 *                           top-level {@code categories} object of the analyzer JSON)
 */
public record AnalyzerResult(boolean available, String error, Map<String, Object> signalsByCategory) {

    public static AnalyzerResult unavailable(String error) {
        return new AnalyzerResult(false, error, Map.of());
    }

    public static AnalyzerResult available(Map<String, Object> signalsByCategory) {
        return new AnalyzerResult(true, null, signalsByCategory);
    }
}
