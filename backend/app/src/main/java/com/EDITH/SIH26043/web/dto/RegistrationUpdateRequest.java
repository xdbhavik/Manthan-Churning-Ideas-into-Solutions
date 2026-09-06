package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** PATCH /registration/{id} payload: replaces the draft source payload. */
public record RegistrationUpdateRequest(
        @NotNull Map<String, Object> source
) {
}
