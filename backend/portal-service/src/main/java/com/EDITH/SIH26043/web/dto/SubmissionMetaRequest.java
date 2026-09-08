package com.EDITH.SIH26043.web.dto;

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

        List<Map<String, String>> links
) {
}
