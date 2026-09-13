package com.EDITH.SIH26043.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * Outcome of a multi-pool routing pass — one entry per evaluator pool, so an
 * ADMIN can see exactly who (or what) owns each of the five scorecards a
 * completed cycle is now made of.
 *
 * <p>Every pool is always reported, including the ones that were skipped: a
 * missing pool in a five-pool model is a silent hole, and the {@code reason}
 * field is what explains it (no evaluator under max_workload, AI unavailable, …).
 * A skipped pool carries no assignment row at all, so it simply does not
 * contribute to the cycle's completion.</p>
 */
public record RouteAllOutcomeResponse(
        UUID cycleId,
        String cycleStatus,
        int assignmentsCreated,
        String message,
        List<PoolRoutingOutcome> pools
) {

    /**
     * @param evaluatorType   the pool
     * @param mode            the pool's configured switch ({@code MANUAL}|{@code AUTO})
     * @param handler         what actually took the work: {@code AI}, {@code HUMAN}
     *                        or {@code NONE} when the pool was skipped
     * @param routed          whether an assignment came out of this pool
     * @param assignmentId    the created assignment ({@code null} when skipped)
     * @param profileId       the evaluator (or system AI) profile that owns it
     * @param assignmentStatus {@code ASSIGNED} for a human, {@code SUBMITTED} for AI
     * @param scoreSource     {@code AI}|{@code HUMAN} once scored, else {@code null}
     * @param reason          why the pool ended up with this handler
     */
    public record PoolRoutingOutcome(
            String evaluatorType,
            String mode,
            String handler,
            boolean routed,
            UUID assignmentId,
            UUID profileId,
            String assignmentStatus,
            String scoreSource,
            String reason
    ) {
    }
}
