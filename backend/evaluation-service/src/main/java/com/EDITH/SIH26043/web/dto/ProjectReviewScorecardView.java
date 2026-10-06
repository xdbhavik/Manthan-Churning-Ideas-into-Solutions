package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ProjectReviewScorecardView(
        List<Criterion> criteria,
        String status,
        Map<String, ProjectReviewScorecardRequest.CriterionScore> criteriaScores,
        String overallRemarks,
        int totalScore,
        int maxScore,
        Instant updatedAt,
        Instant submittedAt
) {
    public record Criterion(String key, String label, String description, int maxScore, int sortOrder) { }
}
