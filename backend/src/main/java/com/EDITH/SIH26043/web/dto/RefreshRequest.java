package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Refresh-token rotation payload.
 */
public record RefreshRequest(
        @NotBlank UUID refreshToken
) {
    public record RefreshResponse(
            String accessToken,
            UUID refreshToken
    ) {
    }
}