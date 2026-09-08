package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Intake payload for a new evaluation (§7 of the plan).
 *
 * <p>{@code commitSha} is mandatory: an evaluation is pinned to one exact commit
 * so a later push cannot silently change what was judged. Re-judging a new commit
 * is an explicit new evaluation.</p>
 */
public record EvaluationCreateRequest(

        /** Portal submission id when the portal hands off; null for standalone use. */
        UUID portalSubmissionId,

        @NotNull(message = "problemId is required")
        UUID problemId,

        @Size(max = 255, message = "problemTitle must be at most 255 characters")
        String problemTitle,

        UUID teamId,

        @NotBlank(message = "repositoryUrl is required")
        @Size(max = 500, message = "repositoryUrl must be at most 500 characters")
        String repositoryUrl,

        @Size(max = 120, message = "branch must be at most 120 characters")
        String branch,

        @NotBlank(message = "commitSha is required — a moving branch head must not change what is evaluated")
        @Size(min = 7, max = 64, message = "commitSha must be 7-64 characters")
        @Pattern(regexp = "[A-Za-z0-9._-]+", message = "commitSha contains invalid characters")
        String commitSha,

        @Size(max = 500, message = "demoUrl must be at most 500 characters")
        String demoUrl,

        @Size(max = 500, message = "documentationUrl must be at most 500 characters")
        String documentationUrl
) {
}
