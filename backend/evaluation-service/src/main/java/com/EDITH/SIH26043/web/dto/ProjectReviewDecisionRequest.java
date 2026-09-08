package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Evaluator's decision on a project review: {@code decision} ∈
 * {@code ACCEPTED | RETURNED}, with an optional comment explaining a return.
 */
public record ProjectReviewDecisionRequest(
        @NotBlank(message = "decision is required (ACCEPTED or RETURNED)")
        String decision,

        @Size(max = 2000)
        String comment
) {
}
