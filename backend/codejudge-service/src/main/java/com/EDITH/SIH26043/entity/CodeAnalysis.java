package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.AnalysisStatus;
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
 * One evidence row per agentic-legibility category (bootstrap, entry_points,
 * documentation, architecture, testing, code_quality, security). {@code payload}
 * holds the raw analyzer signals; score/max come from the deterministic signal
 * rubric applied at scan time. {@code tool} records which analyzer (or the
 * HEURISTIC_FALLBACK) produced the row.
 */
@Entity
@Table(name = "code_analysis")
@Getter
@Setter
public class CodeAnalysis {

    @Id
    @Column(name = "analysis_id")
    private UUID analysisId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    @Column(name = "category_key", nullable = false, length = 40)
    private String categoryKey;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private Map<String, Object> payload = new LinkedHashMap<>();

    @Column(name = "tool", nullable = false, length = 80)
    private String tool;

    @Column(name = "tool_version", length = 40)
    private String toolVersion;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "analysis_status")
    private AnalysisStatus status = AnalysisStatus.SUCCESS;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (analysisId == null) {
            analysisId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
