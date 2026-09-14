package com.EDITH.SIH26043.client;

import java.util.UUID;

/**
 * codejudge-service's fast create response: the evaluation is QUEUED, not done.
 * The pipeline (clone → scan → security → AI advisory → scoring → report) runs on
 * CodeJudge's own worker, so the hand-off never blocks the portal.
 *
 * <p>{@code status} travels as a plain string rather than an enum: the two
 * services deliberately share no type for it (same convention as
 * {@code ProblemContextResponse}'s status field).</p>
 */
public record CodeJudgeEvaluationResponse(
        UUID evaluationId,
        UUID submissionId,
        String status) {
}
