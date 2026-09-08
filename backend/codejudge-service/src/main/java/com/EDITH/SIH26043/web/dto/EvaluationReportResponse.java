package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationReport;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * The generated report. {@code reportJson} is the structured form; the markdown
 * rendering is returned directly as {@code text/markdown} by the report endpoint
 * when that is requested.
 */
public record EvaluationReportResponse(UUID evaluationId,
                                       Map<String, Object> reportJson,
                                       String reportMarkdown,
                                       Instant generatedAt) {

    public static EvaluationReportResponse from(EvaluationReport row) {
        return new EvaluationReportResponse(row.getEvaluationId(), row.getReportJson(),
                row.getReportMarkdown(), row.getGeneratedAt());
    }
}
