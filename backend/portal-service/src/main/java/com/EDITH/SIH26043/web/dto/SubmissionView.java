package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Full read model of a project submission for its submitter/team and (through the
 * reviewer id) the assigned evaluator.
 */
public record SubmissionView(
        UUID submissionId,
        UUID problemId,
        UUID teamId,
        String title,
        String summary,
        String githubUrl,
        String commitSha,
        String branch,
        List<Map<String, String>> links,
        String status,
        int reviewRound,
        UUID reviewerUserId,
        String decisionComment,
        Instant submittedAt,
        Instant decidedAt,
        List<FileItemView> files,
        TeamView team
) {
}
