package com.EDITH.SIH26043.client;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Body portal sends to evaluation-service when a project submission is
 * submitted/resubmitted, asking it to open a project-review work item assigned
 * to the SAME evaluator who scored the problem's cycle. The eval service stores
 * a metadata snapshot (never the file bytes) and returns the reviewer ids via
 * {@link ProjectReviewCreateResponse}.
 *
 * @param files metadata snapshot {@code [{fileId, fileName, sizeBytes, contentType}]}
 *              of the submission's current artifacts
 */
public record ProjectReviewCreateRequest(
        UUID submissionId,
        UUID problemId,
        UUID cycleId,
        int round,
        String problemTitle,
        String submissionTitle,
        String summary,
        String githubUrl,
        List<Map<String, String>> links,
        List<ProjectFileMeta> files) {

    public record ProjectFileMeta(
            UUID fileId,
            String fileName,
            long sizeBytes,
            String contentType) {
    }
}
