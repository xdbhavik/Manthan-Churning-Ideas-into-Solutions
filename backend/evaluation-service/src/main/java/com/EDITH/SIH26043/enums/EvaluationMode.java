package com.EDITH.SIH26043.enums;

/**
 * How a pool's problems get scored.
 *
 * <p>Each of the five evaluator pools owns its own switch (see
 * {@code evaluator_pool_mode}), so {@code HEI} can run on AUTO while
 * {@code GOVERNMENT} stays MANUAL — the pools are independent perspectives on the
 * same problem, not one pipeline.</p>
 *
 * <ul>
 *   <li>{@code MANUAL} — the problem is routed to a human evaluator of that pool,
 *       exactly as before this feature existed.</li>
 *   <li>{@code AUTO} — the pool's system AI profile is assigned and the scorecard
 *       is produced by the AI scorer, then submitted through the same write path
 *       a human uses. If the LLM is unavailable the pool degrades to MANUAL for
 *       that run rather than blocking the cycle.</li>
 * </ul>
 */
public enum EvaluationMode {
    MANUAL,
    AUTO
}
