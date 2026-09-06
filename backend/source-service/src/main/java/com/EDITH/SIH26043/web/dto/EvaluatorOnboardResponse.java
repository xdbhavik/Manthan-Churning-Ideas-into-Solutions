package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.UserRole;

import java.util.UUID;

/**
 * Result of an ADMIN-issued evaluator account creation: the created identity
 * plus the OTP challenge minted for the evaluator's first (and only) login.
 * The evaluator never self-registers — they log in via /auth/login + /auth/verify-otp.
 */
public record EvaluatorOnboardResponse(
        UUID userId,
        String phone,
        UserRole role,
        OtpResponse otp
) {
}
