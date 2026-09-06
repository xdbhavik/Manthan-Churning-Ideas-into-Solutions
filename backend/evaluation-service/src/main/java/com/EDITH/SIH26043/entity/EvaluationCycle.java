package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ImpactLevel;
import com.EDITH.SIH26043.enums.PriorityBand;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 2 aggregate root: one evaluation cycle per problem. Holds the lifecycle
 * status plus denormalized final results (score, impact, priority) for cheap
 * reads and Phase 3 handoff.
 */
@Entity
@Table(name = "evaluation_cycle")
@Getter
@Setter
public class EvaluationCycle {

    @Id
    @Column(name = "cycle_id")
    private UUID cycleId;

    @Column(name = "problem_id", nullable = false, unique = true)
    private UUID problemId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "evaluation_status")
    private EvaluationStatus status = EvaluationStatus.RECEIVED;

    /** ADMIN or AUTO. */
    @Column(name = "trigger_method", nullable = false, length = 20)
    private String triggerMethod = "ADMIN";

    @Column(name = "triggered_by_user_id")
    private UUID triggeredByUserId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    /** Denormalized from the aggregation for easy reads (0-100 scale). */
    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "impact_level", columnDefinition = "impact_level")
    private ImpactLevel impactLevel;

    @Column(name = "priority_score", precision = 5, scale = 2)
    private BigDecimal priorityScore;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "priority_band", columnDefinition = "priority_band")
    private PriorityBand priorityBand;

    /** Extensible JSONB for phase-3-relevant metadata. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (cycleId == null) {
            cycleId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (startedAt == null) {
            startedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = EvaluationStatus.RECEIVED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
