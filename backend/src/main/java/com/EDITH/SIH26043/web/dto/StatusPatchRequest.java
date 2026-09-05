package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;

/**
 * PATCH /problems/{id}/status payload: target state plus the optimistic-lock
 * version the client last saw (optional in Phase 1, recommended).
 */
public record StatusPatchRequest(
        @NotNull com.EDITH.SIH26043.enums.ProblemStatus status,
        Integer expectedVersion
) {
}