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
 * Append-only lifecycle trail for an evaluation cycle (mirrors
 * {@code registration_status_history}). Written on every status transition.
 */
@Entity
@Table(name = "evaluation_status_history")
@Getter
@Setter
public class EvaluationStatusHistory {

    @Id
    @Column(name = "history_id")
    private UUID historyId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "from_status", columnDefinition = "evaluation_status")
    private EvaluationStatus fromStatus;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "to_status", nullable = false, columnDefinition = "evaluation_status")
    private EvaluationStatus toStatus;

    @Column(name = "changed_by_user_id")
    private UUID changedByUserId;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        if (historyId == null) {
            historyId = UUID.randomUUID();
        }
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }
}
