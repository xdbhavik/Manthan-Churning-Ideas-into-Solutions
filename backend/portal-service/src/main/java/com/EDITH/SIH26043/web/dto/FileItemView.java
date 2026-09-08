package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Metadata of one uploaded submission artifact.
 */
public record FileItemView(
        UUID fileId,
        String originalName,
        String contentType,
        long sizeBytes,
        String sha256,
        Instant uploadedAt
) {
}
