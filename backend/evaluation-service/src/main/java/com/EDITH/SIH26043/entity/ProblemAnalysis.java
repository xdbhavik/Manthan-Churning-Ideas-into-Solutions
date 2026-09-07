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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Output of the AI problem-analysis step (advisory only — never contributes to
 * the final score). Parsed columns feed routing/prioritization; {@code rawPayload}
 * keeps the full LLM response for audit.
 */
@Entity
@Table(name = "problem_analysis")
@Getter
@Setter
public class ProblemAnalysis {

    @Id
    @Column(name = "analysis_id")
    private UUID analysisId;

    @Column(name = "cycle_id", nullable = false, unique = true)
    private UUID cycleId;

    /** 'openai-compatible' | 'heuristic'. */
    @Column(name = "provider", nullable = false, length = 50)
    private String provider;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "problem_category", length = 100)
    private String problemCategory;

    @Column(name = "domain", length = 100)
    private String domain;

    @Column(name = "sector", length = 100)
    private String sector;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "impact_areas", nullable = false)
    private List<String> impactAreas = new ArrayList<>();

    @Column(name = "complexity", length = 50)
    private String complexity;

    @Column(name = "potential_scale", length = 50)
    private String potentialScale;

    @Column(name = "technology_relevance", length = 50)
    private String technologyRelevance;

    @Column(name = "social_impact", length = 50)
    private String socialImpact;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "analysis_status")
    private AnalysisStatus status = AnalysisStatus.SUCCESS;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "model_version", length = 100)
    private String modelVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", nullable = false)
    private Map<String, Object> rawPayload = Map.of();

    @Column(name = "analyzed_at", nullable = false)
    private Instant analyzedAt;

    @PrePersist
    void onCreate() {
        if (analysisId == null) {
            analysisId = UUID.randomUUID();
        }
        if (analyzedAt == null) {
            analyzedAt = Instant.now();
        }
        if (status == null) {
            status = AnalysisStatus.SUCCESS;
        }
    }
}
