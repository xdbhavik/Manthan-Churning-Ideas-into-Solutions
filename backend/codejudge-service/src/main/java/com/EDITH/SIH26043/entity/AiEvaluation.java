package com.EDITH.SIH26043.entity;

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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Advisory AI output. In the default deployment the LLM key is empty, so a single
 * {@code UNAVAILABLE} row is recorded and the pipeline continues on deterministic
 * evidence. Never a scoring authority — the AI supplies assessments, not marks.
 */
@Entity
@Table(name = "ai_evaluation")
@Getter
@Setter
public class AiEvaluation {

    @Id
    @Column(name = "ai_evaluation_id")
    private UUID aiEvaluationId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    /** AVAILABLE | UNAVAILABLE | ERROR | SKIPPED. */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "UNAVAILABLE";

    @Column(name = "model", length = 120)
    private String model;

    @Column(name = "confidence")
    private Double confidence;

    /** Normalised advisory payload (assessments/strengths/weaknesses). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private Map<String, Object> payload = new LinkedHashMap<>();

    /** Full request/response for audit. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload")
    private Map<String, Object> rawPayload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (aiEvaluationId == null) {
            aiEvaluationId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
