package com.EDITH.SIH26043.web.dto;

import java.util.Map;

public record ProjectReviewScorecardRequest(
        Map<String, CriterionScore> criteriaScores,
        String overallRemarks,
        boolean submit
) {
    public record CriterionScore(Integer score, String comment) { }
}
