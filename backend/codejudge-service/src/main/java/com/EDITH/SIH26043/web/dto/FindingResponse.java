package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationFinding;
import com.EDITH.SIH26043.enums.FindingSeverity;

import java.time.Instant;

/**
 * A report finding with the evidence reference that justifies it.
 */
public record FindingResponse(FindingSeverity severity,
                              String category,
                              String message,
                              String evidenceRef,
                              Instant createdAt) {

    public static FindingResponse from(EvaluationFinding row) {
        return new FindingResponse(row.getSeverity(), row.getCategory(),
                row.getMessage(), row.getEvidenceRef(), row.getCreatedAt());
    }
}
