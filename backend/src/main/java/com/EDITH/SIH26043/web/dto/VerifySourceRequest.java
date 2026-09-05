package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;

/**
 * POST /sources/{id}/verify payload (REVIEWER only, doc 11 sec 1).
 */
public record VerifySourceRequest(
        @NotNull com.EDITH.SIH26043.enums.VerificationMethod method,
        @NotNull com.EDITH.SIH26043.enums.VerificationResult result,
        String notes,
        String evidenceUrl
) {
}