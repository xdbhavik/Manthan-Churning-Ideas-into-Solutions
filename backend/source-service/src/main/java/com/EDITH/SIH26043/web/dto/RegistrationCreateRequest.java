package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.SubEntityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * POST /registration payload. Public endpoint: a new user registers their
 * organization here and the backend creates the user account internally.
 *
 * <p>Three clear sections:</p>
 * <ul>
 *   <li>{@code account} — who will login (phone/email)</li>
 *   <li>{@code source} — which organization is registering (bucket-specific fields)</li>
 *   <li>{@code documents} — how the source will be verified</li>
 * </ul>
 */
public record RegistrationCreateRequest(
        @NotNull SubEntityType sourceType,
        @NotNull @Valid AccountPayload account,
        @NotNull Map<String, Object> source,
        List<@Valid DocumentPayload> documents
) {
    /**
     * Contact credentials for the account that will own this registration.
     * Phone is the OTP login identity; email is optional.
     */
    public record AccountPayload(
            @NotBlank
            @Pattern(regexp = "^[0-9]{10}$", message = "phone must be a 10-digit number")
            String phone,
            @Size(max = 100) String email
    ) {
    }

    /**
     * A document that supports the registration (authorization letter,
     * registration certificate, etc.). Stored in source_payload until review.
     */
    public record DocumentPayload(
            String documentType,
            String documentId
    ) {
    }
}
