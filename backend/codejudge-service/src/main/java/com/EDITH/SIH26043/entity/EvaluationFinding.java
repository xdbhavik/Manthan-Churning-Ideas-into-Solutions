package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.FindingSeverity;
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
 * A human-readable finding surfaced in the report, ordered by severity. Each one
 * references the underlying evidence (category / file) so marks are challengeable.
 */
@Entity
@Table(name = "evaluation_finding")
@Getter
@Setter
public class EvaluationFinding {

    @Id
    @Column(name = "finding_id")
    private UUID findingId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", nullable = false, columnDefinition = "finding_severity")
    private FindingSeverity severity;

    /** CodeJudge category key or stage name this finding belongs to. */
    @Column(name = "category", nullable = false, length = 40)
    private String category;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "evidence_ref", length = 500)
    private String evidenceRef;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (findingId == null) {
            findingId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
