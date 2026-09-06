package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.ProblemAnalysis;
import com.EDITH.SIH26043.enums.AnalysisStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * AI problem profile shown to evaluators and admins. Advisory only — it never
 * contributes to the evaluation score.
 */
public record ProblemAnalysisResponse(
        UUID analysisId,
        UUID cycleId,
        String provider,
        String model,
        String problemCategory,
        String domain,
        String sector,
        List<String> impactAreas,
        String complexity,
        String potentialScale,
        String technologyRelevance,
        String socialImpact,
        String aiSummary,
        AnalysisStatus status,
        String errorMessage,
        Long latencyMs,
        Instant analyzedAt
) {

    public static ProblemAnalysisResponse from(ProblemAnalysis a) {
        Object summary = a.getRawPayload() == null ? null : a.getRawPayload().get("aiSummary");
        return new ProblemAnalysisResponse(
                a.getAnalysisId(), a.getCycleId(), a.getProvider(), a.getModel(),
                a.getProblemCategory(), a.getDomain(), a.getSector(), a.getImpactAreas(),
                a.getComplexity(), a.getPotentialScale(), a.getTechnologyRelevance(),
                a.getSocialImpact(), summary == null ? null : String.valueOf(summary),
                a.getStatus(), a.getErrorMessage(), a.getLatencyMs(), a.getAnalyzedAt());
    }
}
