package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluatorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

/**
 * One scoring criterion in a pool's catalog (seeded in V13). Each criterion has
 * a {@code maxScore} (5 or 10); responses validate score in [1, maxScore].
 */
@Entity
@Table(name = "evaluation_criterion")
@Getter
@Setter
public class EvaluationCriterion {

    @Id
    @Column(name = "criterion_id")
    private UUID criterionId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "evaluator_type", nullable = false, columnDefinition = "evaluator_type")
    private EvaluatorType evaluatorType;

    @Column(name = "criterion_key", nullable = false, length = 50)
    private String criterionKey;

    @Column(name = "criterion_label", nullable = false, length = 255)
    private String criterionLabel;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore = 10;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @PrePersist
    void onCreate() {
        if (criterionId == null) {
            criterionId = UUID.randomUUID();
        }
        if (maxScore == null) {
            maxScore = 10;
        }
        if (sortOrder == null) {
            sortOrder = 0;
        }
    }
}
