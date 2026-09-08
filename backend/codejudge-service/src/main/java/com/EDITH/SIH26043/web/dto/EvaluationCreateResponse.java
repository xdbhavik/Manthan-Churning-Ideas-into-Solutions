package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;

import java.util.UUID;

/**
 * Fast create response (202-style semantics): the work is queued, not done.
 */
public record EvaluationCreateResponse(UUID evaluationId, UUID submissionId, EvaluationStatus status) {

    public static EvaluationCreateResponse from(Evaluation evaluation) {
        return new EvaluationCreateResponse(evaluation.getEvaluationId(),
                evaluation.getSubmissionId(), evaluation.getStatus());
    }
}
