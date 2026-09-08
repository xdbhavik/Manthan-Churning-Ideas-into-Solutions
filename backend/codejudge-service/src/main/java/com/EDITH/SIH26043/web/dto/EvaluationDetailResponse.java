package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.ProjectSubmission;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.Verdict;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Status view of one evaluation plus its append-only transition trail — what a
 * client polls after create.
 */
public record EvaluationDetailResponse(
        UUID evaluationId,
        UUID submissionId,
        UUID problemId,
        String problemTitle,
        UUID teamId,
        String repositoryUrl,
        String branch,
        String commitSha,
        EvaluationStatus status,
        String scoringVersion,
        Double finalScore,
        Verdict verdict,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        List<StatusHistoryResponse> history
) {

    public static EvaluationDetailResponse from(Evaluation evaluation,
                                                ProjectSubmission submission,
                                                List<StatusHistoryResponse> history) {
        return new EvaluationDetailResponse(
                evaluation.getEvaluationId(),
                evaluation.getSubmissionId(),
                submission == null ? null : submission.getProblemId(),
                submission == null ? null : submission.getProblemTitle(),
                submission == null ? null : submission.getTeamId(),
                submission == null ? null : submission.getRepositoryUrl(),
                submission == null ? null : submission.getBranch(),
                submission == null ? null : submission.getCommitSha(),
                evaluation.getStatus(),
                evaluation.getScoringVersion(),
                evaluation.getFinalScore(),
                evaluation.getVerdict(),
                evaluation.getStartedAt(),
                evaluation.getCompletedAt(),
                evaluation.getCreatedAt(),
                history);
    }
}
