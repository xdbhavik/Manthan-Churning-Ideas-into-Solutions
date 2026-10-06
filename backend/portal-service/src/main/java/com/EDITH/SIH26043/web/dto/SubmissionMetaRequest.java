package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * Edits the descriptive meta of a DRAFT / RETURNED submission.
 */
public record SubmissionMetaRequest(
        @Size(max = 255)
        String title,

        @Size(max = 20000)
        String summary,

        @Size(max = 500)
        String githubUrl,

        @Size(max = 64, message = "commitSha must be at most 64 characters")
        @Pattern(regexp = "[A-Za-z0-9._-]*", message = "commitSha contains invalid characters")
        String commitSha,

        @Size(max = 120)
        String branch,

        List<Map<String, String>> links,

        Map<String, Object> projectDetails
) {
    public SubmissionMetaRequest(String title, String summary, String githubUrl,
                                String commitSha, String branch,
                                List<Map<String, String>> links) {
        this(title, summary, githubUrl, commitSha, branch, links, null);
    }
}
