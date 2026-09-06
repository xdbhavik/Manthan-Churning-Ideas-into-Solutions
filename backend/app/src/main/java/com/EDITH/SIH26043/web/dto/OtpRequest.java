package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Phone-initiated OTP request (registration or login).
 */
public record OtpRequest(
        @NotBlank
        @Pattern(regexp = "^[0-9]{10}$", message = "phone must be a 10-digit number")
        String phone,
        @Size(max = 100) String email
) {
}