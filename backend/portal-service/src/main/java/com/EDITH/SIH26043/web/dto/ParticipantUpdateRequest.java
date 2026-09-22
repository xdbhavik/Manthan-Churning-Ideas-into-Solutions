package com.EDITH.SIH26043.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ParticipantUpdateRequest(
        @Schema(description = "Updated full name (can be null to keep unchanged)")
        String fullName,

        @Schema(description = "Updated email address (can be null to keep unchanged)")
        String email,

        @Schema(description = "Updated phone number (can be null to keep unchanged)")
        String phone
) {
}
