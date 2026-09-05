package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.SubEntityType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * POST /registration payload. Bucket is derived server-side from sourceType;
 * bucket-specific fields travel as a JSON map and are validated against the
 * SourceTypeCatalog on submit.
 */
public record RegistrationCreateRequest(
        @NotNull SubEntityType sourceType,
        Map<String, Object> source
) {
}
