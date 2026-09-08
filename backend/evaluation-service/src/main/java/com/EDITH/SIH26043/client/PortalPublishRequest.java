package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;

import java.util.UUID;

/**
 * Body evaluation-service sends portal-service when a cycle completes: the cycle
 * id (not carried by the shared problem snapshot) plus the full problem-context
 * snapshot that seeds the published catalog row.
 */
public record PortalPublishRequest(
        UUID cycleId,
        ProblemContextResponse problem
) {
}
