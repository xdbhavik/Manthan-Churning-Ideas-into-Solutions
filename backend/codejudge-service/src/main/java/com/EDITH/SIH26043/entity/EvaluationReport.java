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
 * The rendered report + audit footer. {@code reportJson} is the structured form
 * consumed by the report API; {@code reportMarkdown} is the human-readable
 * rendering the portal can display. One row per evaluation (re-evaluations create
 * a new evaluation row).
 */
@Entity
@Table(name = "evaluation_report")
@Getter
@Setter
public class EvaluationReport {

    @Id
    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "evaluation_id", nullable = false, unique = true)
    private UUID evaluationId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "report_json", nullable = false)
    private Map<String, Object> reportJson = new LinkedHashMap<>();

    @Column(name = "report_markdown", nullable = false, columnDefinition = "text")
    private String reportMarkdown;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @PrePersist
    void onCreate() {
        if (reportId == null) {
            reportId = UUID.randomUUID();
        }
        if (generatedAt == null) {
            generatedAt = Instant.now();
        }
    }
}
