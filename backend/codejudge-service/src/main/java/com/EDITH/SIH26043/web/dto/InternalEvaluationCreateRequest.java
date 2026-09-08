package com.EDITH.SIH26043.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Trusted internal create (portal-service / evaluation-service hand-off): the same
 * intake payload plus the owner the submission belongs to, since the caller is a
 * service rather than the student.
 */
public record InternalEvaluationCreateRequest(
        @NotNull(message = "ownerUserId is required")
        UUID ownerUserId,

        @NotNull(message = "submission is required")
        @Valid
        EvaluationCreateRequest submission
) {
}
