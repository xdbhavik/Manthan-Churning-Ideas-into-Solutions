package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body evaluation-service sends to portal after an evaluator decides a project
 * review: {@code decision} is {@code ACCEPTED} or {@code RETURNED}.
 */
public record ReviewResultPushRequest(
        @NotBlank(message = "decision is required (ACCEPTED/RETURNED)")
        String decision,

        @Size(max = 4000)
        String comment
) {
}
