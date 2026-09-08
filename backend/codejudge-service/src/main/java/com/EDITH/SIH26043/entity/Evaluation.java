package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.Verdict;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregate root: one row per evaluation run of a submission. Status walks the
 * state machine driven by the worker; the scoring stage sets {@code finalScore},
 * {@code verdict} and snapshots the applied config + tool versions so historical
 * reports stay truthful after scoring-rule changes.
 */
@Entity
@Table(name = "evaluation")
@Getter
@Setter
public class Evaluation {

    @Id
    @Column(name = "evaluation_id")
    private UUID evaluationId;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "evaluation_status")
    private EvaluationStatus status = EvaluationStatus.QUEUED;

    @Column(name = "scoring_version", length = 20)
    private String scoringVersion;

    @Column(name = "final_score")
    private Double finalScore;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "verdict", columnDefinition = "verdict")
    private Verdict verdict;

    /** Snapshot of the applied category/policy config, copied by the scoring stage. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_snapshot", nullable = false)
    private Map<String, Object> configSnapshot = new LinkedHashMap<>();

    /** Tool + version evidence, e.g. {"agentic-legibility": "…"}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_versions", nullable = false)
    private Map<String, Object> toolVersions = new LinkedHashMap<>();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (evaluationId == null) {
            evaluationId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = EvaluationStatus.QUEUED;
        }
        if (configSnapshot == null) {
            configSnapshot = new LinkedHashMap<>();
        }
        if (toolVersions == null) {
            toolVersions = new LinkedHashMap<>();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
