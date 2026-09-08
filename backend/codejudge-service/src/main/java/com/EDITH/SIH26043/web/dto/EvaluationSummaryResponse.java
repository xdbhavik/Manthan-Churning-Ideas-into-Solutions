package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.Verdict;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Compact summary a calling service (portal / evaluation) shows a human reviewer:
 * the deterministic verdict plus the category breakdown, without the full report.
 */
public record EvaluationSummaryResponse(UUID evaluationId,
                                        UUID submissionId,
                                        UUID portalSubmissionId,
                                        EvaluationStatus status,
                                        String scoringVersion,
                                        Double finalScore,
                                        Verdict verdict,
                                        Instant completedAt,
                                        List<CategoryScoreResponse> categories,
                                        List<FindingResponse> findings) {

    public static EvaluationSummaryResponse of(Evaluation evaluation,
                                               UUID portalSubmissionId,
                                               List<CategoryScoreResponse> categories,
                                               List<FindingResponse> findings) {
        return new EvaluationSummaryResponse(
                evaluation.getEvaluationId(),
                evaluation.getSubmissionId(),
                portalSubmissionId,
                evaluation.getStatus(),
                evaluation.getScoringVersion(),
                evaluation.getFinalScore(),
                evaluation.getVerdict(),
                evaluation.getCompletedAt(),
                categories,
                findings);
    }
}
