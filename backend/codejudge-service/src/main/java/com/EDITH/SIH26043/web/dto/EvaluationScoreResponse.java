package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.Verdict;

import java.util.List;
import java.util.UUID;

/**
 * Score view: the weighted total, the verdict band and every category's
 * contribution. {@code NOT_EVALUATED} categories are reported explicitly at 0
 * rather than guessed, so a reader can see what the deployment did not measure.
 */
public record EvaluationScoreResponse(UUID evaluationId,
                                      EvaluationStatus status,
                                      String scoringVersion,
                                      Double finalScore,
                                      Verdict verdict,
                                      List<CategoryScoreResponse> categories) {
}
