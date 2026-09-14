package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creates a DRAFT submission against a published problem. Team mode is implied
 * by {@code memberUserIds} being non-empty (and optionally a {@code teamName});
 * otherwise the submission is individual. Every member — including the caller —
 * must be able to see the problem under its access rule.
 */
public record SubmissionCreateRequest(
        @NotNull(message = "problemId is required")
        UUID problemId,

        @Size(max = 255)
        String title,

        @Size(max = 20000)
        String summary,

        @Size(max = 500)
        String githubUrl,

        /**
         * The exact commit to judge. Optional while drafting — a repo-backed
         * submission must pin one (7-64 chars) by the time it is submitted, since
         * codejudge-service refuses to evaluate a moving branch HEAD.
         */
        @Size(max = 64, message = "commitSha must be at most 64 characters")
        @Pattern(regexp = "[A-Za-z0-9._-]*", message = "commitSha contains invalid characters")
        String commitSha,

        @Size(max = 120)
        String branch,

        List<Map<String, String>> links,

        @Size(max = 150)
        String teamName,

        List<UUID> memberUserIds
) {
}
