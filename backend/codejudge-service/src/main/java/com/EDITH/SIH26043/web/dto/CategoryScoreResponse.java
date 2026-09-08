package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationCategoryScore;

/**
 * One category's contribution to the final score, with the auditable status
 * ({@code EVALUATED} / {@code NOT_EVALUATED}) and the note explaining it.
 */
public record CategoryScoreResponse(String categoryKey,
                                    Double score,
                                    Double maxScore,
                                    Double weight,
                                    String status,
                                    String note) {

    public static CategoryScoreResponse from(EvaluationCategoryScore row) {
        return new CategoryScoreResponse(row.getCategoryKey(), row.getScore(),
                row.getMaxScore(), row.getWeight(), row.getStatus(), row.getNote());
    }
}
