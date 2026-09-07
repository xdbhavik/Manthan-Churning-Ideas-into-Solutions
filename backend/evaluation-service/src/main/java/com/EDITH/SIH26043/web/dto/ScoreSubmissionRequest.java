package com.EDITH.SIH26043.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * An evaluator's completed scorecard. Every active criterion of their pool must
 * appear exactly once — partial scorecards are rejected, so an assignment is
 * either unscored or fully scored and aggregation never averages a half-filled
 * form.
 *
 * @param scores         one entry per criterion, identified by {@code criterionId}
 *                       <em>or</em> the friendlier {@code criterionKey}
 * @param recommendation short free-text verdict (e.g. "Prioritize for pilot")
 */
public record ScoreSubmissionRequest(
        @NotEmpty(message = "scores is required — one entry per criterion of your pool")
        List<@Valid CriterionScore> scores,

        @Size(max = 4000)
        String feedback,

        @Size(max = 255)
        String recommendation
) {

    /**
     * @param score 1..10; the per-criterion {@code maxScore} is enforced in the
     *              service, this bound mirrors the column's CHECK constraint
     */
    public record CriterionScore(
            UUID criterionId,

            @Size(max = 50)
            String criterionKey,

            @NotNull(message = "score is required")
            @Min(value = 1, message = "score must be at least 1")
            @Max(value = 10, message = "score must be at most 10")
            Integer score,

            @Size(max = 4000)
            String comment
    ) {
    }
}
