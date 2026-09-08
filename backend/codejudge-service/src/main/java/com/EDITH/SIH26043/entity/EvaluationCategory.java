package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * SEEDED config (V2): one of the eight CodeJudge categories. {@code weight} and
 * {@code maxScore} are data, not code — changing a weight is a config change plus
 * a new scoring version, never a redeploy-with-new-logic.
 */
@Entity
@Table(name = "evaluation_category")
@Getter
@Setter
public class EvaluationCategory {

    @Id
    @Column(name = "category_key", length = 40)
    private String categoryKey;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @Column(name = "weight", nullable = false)
    private Double weight;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }
}
