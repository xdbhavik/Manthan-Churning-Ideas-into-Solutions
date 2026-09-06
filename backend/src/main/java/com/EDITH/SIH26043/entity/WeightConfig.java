package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluatorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Configurable aggregation weight per evaluator type (admin-editable via API).
 * Aggregation falls back to equal weights if these rows are missing/off-sum.
 */
@Entity
@Table(name = "weight_config")
@Getter
@Setter
public class WeightConfig {

    @Id
    @Column(name = "weight_id")
    private UUID weightId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "evaluator_type", nullable = false, unique = true, columnDefinition = "evaluator_type")
    private EvaluatorType evaluatorType;

    @Column(name = "weight", nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = true;

    @Column(name = "updated_by_user_id")
    private UUID updatedByUserId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (weightId == null) {
            weightId = UUID.randomUUID();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
