package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MentorAssignmentRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 255) String organization,
        @Size(max = 2000) String note
) { }
