package com.EDITH.SIH26043.client;

import java.util.UUID;

/**
 * Body portal sends to codejudge-service when a repo-backed submission is
 * submitted, asking it to queue an automated evaluation of the pinned commit.
 *
 * <p>Mirrors codejudge's {@code EvaluationCreateRequest} for the fields the portal
 * owns. {@code portalSubmissionId} is what lets CodeJudge push a result back to
 * this submission later; {@code problemTitle} is the title the student actually
 * saw, which CodeJudge keeps as the authoritative label (its own problem-service
 * snapshot is only a fallback).</p>
 */
public record CodeJudgeEvaluationRequest(
        UUID portalSubmissionId,
        UUID problemId,
        String problemTitle,
        UUID teamId,
        String repositoryUrl,
        String branch,
        String commitSha) {
}
