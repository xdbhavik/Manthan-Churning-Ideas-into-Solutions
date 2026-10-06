package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Body portal-service sends when a student submits a project: enough context for
 * evaluation-service to open a review work item assigned to the same evaluator
 * who scored the problem's cycle. Files are a metadata-only snapshot — portal
 * keeps the bytes.
 */
public record ProjectReviewCreateRequest(
        @NotNull(message = "submissionId is required")
        UUID submissionId,

        @NotNull(message = "problemId is required")
        UUID problemId,

        @NotNull(message = "cycleId is required")
        UUID cycleId,

        @NotNull(message = "round is required")
        Integer round,

        String problemTitle,
        String submissionTitle,
        String summary,
        String githubUrl,
        List<Map<String, String>> links,
        List<ProjectFileMeta> files,
        Map<String, Object> context
) {
    public ProjectReviewCreateRequest(UUID submissionId, UUID problemId, UUID cycleId, Integer round,
                                     String problemTitle, String submissionTitle, String summary,
                                     String githubUrl, List<Map<String, String>> links,
                                     List<ProjectFileMeta> files) {
        this(submissionId, problemId, cycleId, round, problemTitle, submissionTitle, summary,
                githubUrl, links, files, Map.of());
    }

    public record ProjectFileMeta(
            UUID fileId,
            String fileName,
            Long sizeBytes,
            String contentType
    ) {
    }
}
