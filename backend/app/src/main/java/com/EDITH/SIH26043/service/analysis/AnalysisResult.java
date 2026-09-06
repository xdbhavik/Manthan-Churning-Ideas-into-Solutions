package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.AnalysisStatus;

import java.util.List;
import java.util.Map;

/**
 * Structured problem profile produced by either the LLM client or the
 * heuristic fallback. Adheres to the Phase 2 AI contract (§13): the AI assists
 * human evaluators but never issues a final score.
 *
 * @param rawPayload full LLM response (or fallback context) kept for audit
 * @param status     SUCCESS for a parsed LLM result, HEURISTIC_FALLBACK otherwise
 */
public record AnalysisResult(
        String problemCategory,
        String domain,
        String sector,
        List<String> impactAreas,
        String complexity,
        String potentialScale,
        String technologyRelevance,
        String socialImpact,
        String aiSummary,
        String provider,
        String model,
        AnalysisStatus status,
        Map<String, Object> rawPayload,
        String errorMessage
) {
}
