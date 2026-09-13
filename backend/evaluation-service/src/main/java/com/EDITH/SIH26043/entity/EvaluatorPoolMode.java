package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluationMode;
import com.EDITH.SIH26043.enums.EvaluatorType;
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
import java.util.UUID;

/**
 * One row per evaluator pool: that pool's own MANUAL/AUTO switch.
 *
 * <p>The PK is the pool itself, which is what makes the five switches
 * independent — there is deliberately no global row and no fallback hierarchy.
 * A missing row reads as {@code MANUAL} (see {@code EvaluatorPoolModeService}),
 * so a deployment that never touches this table keeps the pre-AUTO behaviour.</p>
 *
 * <p>Shape mirrors {@link WeightConfig}: the same one-row-per-{@code EvaluatorType}
 * config table, the same audit-of-who-changed-it columns.</p>
 */
@Entity
@Table(name = "evaluator_pool_mode")
@Getter
@Setter
public class EvaluatorPoolMode {

    @Id
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "evaluator_type", nullable = false, columnDefinition = "evaluator_type")
    private EvaluatorType evaluatorType;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "mode", nullable = false, columnDefinition = "evaluation_mode")
    private EvaluationMode mode = EvaluationMode.MANUAL;

    /** The evaluator (or ADMIN) who last flipped this switch. */
    @Column(name = "updated_by_user_id")
    private UUID updatedByUserId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (mode == null) {
            mode = EvaluationMode.MANUAL;
        }
        if (version == null) {
            version = 1;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
