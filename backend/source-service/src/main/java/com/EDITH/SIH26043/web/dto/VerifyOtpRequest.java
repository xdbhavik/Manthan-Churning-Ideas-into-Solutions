package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

/**
 * OTP verification payload.
 */
public record VerifyOtpRequest(
        @NotNull UUID challengeId,
        @NotBlank String code
) {
    public record VerifyOtpResponse(
            String accessToken,
            UUID refreshToken,
            UserResponse user,
            Instant expiresAt
    ) {
    }
}