package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;

import java.time.Instant;

/**
 * One lifecycle transition of an evaluation.
 */
public record StatusHistoryResponse(EvaluationStatus fromStatus,
                                    EvaluationStatus toStatus,
                                    String actor,
                                    String note,
                                    Instant createdAt) {

    public static StatusHistoryResponse from(EvaluationStatusHistory row) {
        return new StatusHistoryResponse(row.getFromStatus(), row.getToStatus(),
                row.getActor(), row.getNote(), row.getCreatedAt());
    }
}
