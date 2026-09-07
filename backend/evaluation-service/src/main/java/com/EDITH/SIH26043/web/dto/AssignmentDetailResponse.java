package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.internal.ProblemContextResponse;

import java.util.List;

/**
 * Everything an evaluator needs on one screen to score a problem: their work
 * item, the problem itself (fetched from problem-service), the advisory AI
 * profile, and the criteria of their pool with any score they already entered.
 *
 * @param problem  the problem under evaluation; {@code null} when problem-service
 *                 could not be reached — the criteria form still renders
 * @param analysis advisory AI profile; {@code null} when analysis never ran.
 *                 It must never influence the score (§13.4) — it is context only
 */
public record AssignmentDetailResponse(
        MyAssignmentResponse assignment,
        String feedback,
        String recommendation,
        ProblemContextResponse problem,
        ProblemAnalysisResponse analysis,
        List<CriterionScoreResponse> criteria
) {
}
