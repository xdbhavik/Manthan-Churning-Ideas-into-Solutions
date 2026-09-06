package com.EDITH.SIH26043.web.dto;

import java.util.UUID;

/**
 * Outcome of a routing attempt ({@code auto} after analyze, or the explicit
 * {@code POST /evaluation/cycles/{cycleId}/route} retry).
 *
 * <p>{@code routed == false} is a normal, non-error outcome: no active evaluator
 * of the matching pool was under its workload limit, so the cycle stays
 * {@code ROUTING} and a later retry may succeed once capacity frees up.</p>
 */
public record RouteOutcomeResponse(
        boolean routed,
        UUID assignmentId,
        UUID profileId,
        String evaluatorType,
        String message
) {
}
