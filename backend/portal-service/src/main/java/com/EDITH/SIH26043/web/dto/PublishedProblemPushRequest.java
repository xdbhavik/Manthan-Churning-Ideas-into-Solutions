package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Body evaluation-service sends to portal when a cycle completes: the cycle id
 * (not part of the problem snapshot) plus the full problem-context snapshot that
 * seeds the published catalog row.
 */
public record PublishedProblemPushRequest(
        @NotNull(message = "cycleId is required")
        UUID cycleId,

        @Valid
        @NotNull(message = "problem is required")
        ProblemContextResponse problem
) {
}
