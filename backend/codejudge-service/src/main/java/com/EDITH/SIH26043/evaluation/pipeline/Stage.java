package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.enums.EvaluationStatus;

/**
 * One step of the evaluation state machine. Every stage
 * <ol>
 *   <li>transitions the evaluation to its own {@link #status()} (append-only
 *       {@code evaluation_status_history} row), then</li>
 *   <li>writes its evidence inside its own transaction.</li>
 * </ol>
 * Stage failures are intentionally NOT caught here — the {@link EvaluationPipeline}
 * catches them, marks the evaluation {@code FAILED} with the stage reason, and lets
 * the job be retried later.
 */
public interface Stage {

    /** The state-machine status this stage represents (also the pre-state guard). */
    EvaluationStatus status();

    void execute(EvaluationContext context);
}
