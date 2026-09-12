package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.EvaluationMode;
import jakarta.validation.constraints.NotNull;

/**
 * Flip one pool's switch. The pool itself is the path variable, so this body
 * carries only the target mode.
 *
 * <p>Accepted only from the evaluator who owns that pool (their
 * {@code evaluator_profile.evaluator_type} matches it) or from an ADMIN; see
 * {@code EvaluatorPoolModeService}.</p>
 */
public record PoolModeUpdateRequest(
        @NotNull(message = "mode is required (MANUAL or AUTO)")
        EvaluationMode mode
) {
}
