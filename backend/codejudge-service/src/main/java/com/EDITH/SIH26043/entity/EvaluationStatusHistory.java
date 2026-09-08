package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only lifecycle trail of an evaluation's state transitions.
 */
@Entity
@Table(name = "evaluation_status_history")
@Getter
@Setter
public class EvaluationStatusHistory {

    @Id
    @Column(name = "history_id")
    private UUID historyId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "from_status", columnDefinition = "evaluation_status")
    private EvaluationStatus fromStatus;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "to_status", nullable = false, columnDefinition = "evaluation_status")
    private EvaluationStatus toStatus;

    /** 'MACHINE' for worker-driven transitions, else the acting user id. */
    @Column(name = "actor", nullable = false, length = 120)
    private String actor = "MACHINE";

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (historyId == null) {
            historyId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
