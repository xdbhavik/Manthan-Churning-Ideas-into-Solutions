package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.EvaluatorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * ADMIN binds a source-service EVALUATOR user (created via
 * {@code POST /users/evaluators}, which returns the {@code userId}) to an
 * evaluation profile in this service's database.
 *
 * <p>One profile per evaluator user; the {@code evaluatorType} selects the pool
 * that routing draws from for problems of the matching origin bucket.</p>
 */
public record EvaluatorProfileRequest(
        @NotNull(message = "userId is required — the EVALUATOR user's id from source-service")
        UUID userId,

        @NotNull(message = "evaluatorType is required (GOVERNMENT/INDUSTRY/HEI/CITIZEN/COMMUNITY)")
        EvaluatorType evaluatorType,

        @NotBlank(message = "fullName is required")
        @Size(max = 150)
        String fullName,

        @Size(max = 255)
        String organization,

        @Size(max = 150)
        String designation,

        Integer experienceYears,

        Integer maxWorkload
) {
}
