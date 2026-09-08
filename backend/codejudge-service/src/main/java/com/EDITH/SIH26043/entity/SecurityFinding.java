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
 * A secrets/SAST finding from the built-in static scan. HIGH findings subtract
 * from the Security category; CRITICAL findings block the evaluation into a
 * BLOCKED verdict when the policy says so.
 */
@Entity
@Table(name = "security_finding")
@Getter
@Setter
public class SecurityFinding {

    @Id
    @Column(name = "finding_id")
    private UUID findingId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", nullable = false, columnDefinition = "finding_severity")
    private FindingSeverity severity;

    @Column(name = "type", nullable = false, length = 60)
    private String type;

    @Column(name = "file", length = 500)
    private String file;

    @Column(name = "line")
    private Integer line;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

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
