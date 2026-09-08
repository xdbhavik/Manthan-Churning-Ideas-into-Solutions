package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-run category result. score/max always reference the underlying evidence
 * (code_analysis / security_finding rows) so the total is auditable.
 * {@code status}: EVALUATED | NOT_EVALUATED | BLOCKED.
 */
@Entity
@Table(name = "evaluation_category_score")
@Getter
@Setter
public class EvaluationCategoryScore {

    @Id
    @Column(name = "category_score_id")
    private UUID categoryScoreId;

    @Column(name = "evaluation_id", nullable = false)
    private UUID evaluationId;

    @Column(name = "category_key", nullable = false, length = 40)
    private String categoryKey;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @Column(name = "weight", nullable = false)
    private Double weight;

    /** EVALUATED | NOT_EVALUATED | BLOCKED. */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "EVALUATED";

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (categoryScoreId == null) {
            categoryScoreId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
