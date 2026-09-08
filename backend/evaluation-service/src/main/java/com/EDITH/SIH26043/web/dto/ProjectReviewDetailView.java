package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Full project-review read model for the evaluator console. The submitted files
 * carry a {@code contentUrl} relative to the public gateway
 * ({@code /portal/files/{fileId}/download}) so the browser downloads the actual
 * bytes from portal-service with the reviewer's own JWT.
 */
public record ProjectReviewDetailView(
        UUID projectReviewId,
        UUID submissionId,
        UUID problemId,
        UUID cycleId,
        String problemTitle,
        String submissionTitle,
        String summary,
        String githubUrl,
        List<Map<String, String>> links,
        Integer round,
        String status,
        String decisionComment,
        List<ProjectReviewFile> files,
        Instant createdAt,
        Instant decidedAt
) {
    public record ProjectReviewFile(
            UUID fileId,
            String fileName,
            Long sizeBytes,
            String contentType,
            String contentUrl
    ) {
    }
}
