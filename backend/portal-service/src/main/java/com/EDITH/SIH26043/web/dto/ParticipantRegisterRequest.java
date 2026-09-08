package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * STUDENT self-registration on the portal. UNIVERSITY participants are never
 * created here — they auto-bind on first contact from their HEI source account,
 * so an HEI account owner attempting this is rejected with 409.
 */
public record ParticipantRegisterRequest(
        @NotBlank(message = "fullName is required")
        @Size(max = 150)
        String fullName,

        @Email
        @Size(max = 255)
        String email,

        @Size(max = 20)
        String phone
) {
}
