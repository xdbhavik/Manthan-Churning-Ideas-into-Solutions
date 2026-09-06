package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Refresh-token rotation payload.
 */
public record RefreshRequest(
        // @NotBlank has no UUID validator and blows up as a 500 at runtime.
        @NotNull UUID refreshToken
) {
    public record RefreshResponse(
            String accessToken,
            UUID refreshToken
    ) {
    }
}