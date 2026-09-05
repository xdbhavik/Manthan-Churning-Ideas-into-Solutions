package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

/** OTP issuance response; {@code devOtp} is only populated outside production. */
public record OtpResponse(
        UUID challengeId,
        Instant expiresAt,
        String devOtp,
        int requestsRemainingInWindow
) {
}