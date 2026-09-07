package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluationResponse;

import java.util.UUID;

/**
 * One scoring criterion of the evaluator's pool, carrying the evaluator's own
 * score when they have already recorded one (so a partially-filled form can be
 * re-rendered).
 */
public record CriterionScoreResponse(
        UUID criterionId,
        String criterionKey,
        String criterionLabel,
        String description,
        Integer maxScore,
        Integer sortOrder,
        Integer myScore,
        String myComment
) {

    public static CriterionScoreResponse of(EvaluationCriterion c, EvaluationResponse mine) {
        return new CriterionScoreResponse(
                c.getCriterionId(), c.getCriterionKey(), c.getCriterionLabel(),
                c.getDescription(), c.getMaxScore(), c.getSortOrder(),
                mine == null ? null : mine.getScore(),
                mine == null ? null : mine.getComment());
    }
}
