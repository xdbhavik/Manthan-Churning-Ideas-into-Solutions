package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.AggregationStatus;
import com.EDITH.SIH26043.enums.WeightingMethod;
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
 * Final per-cycle aggregation result (1:1 with {@code evaluation_cycle}).
 *
 * <p>{@code perTypeScores} is the explainability snapshot: one entry per
 * {@code EvaluatorType}, always all five. A pool that scored carries
 * {@code present: true} plus {@code normalisedScore} (0-100), {@code rawScore},
 * {@code maxScore}, {@code criteriaScored}, {@code scoreSource} (HUMAN/AI),
 * {@code assignmentId}, {@code submittedAt}, {@code configuredWeight} and
 * {@code effectiveWeight}; a pool that did not carries {@code present: false} and a
 * {@code reason}. The effective weights of the present pools sum to 1 because they
 * are renormalised over the pools that scored, not over all five.</p>
 *
 * <p>{@code numAssignments} is the number of scorecards folded in — i.e. how many
 * pools actually contributed — which is not always five: a pool skipped for want of
 * an evaluator, or one whose evaluator declined, simply does not appear as present.
 * Read {@code perTypeScores} rather than assuming {@code numAssignments == 5}.</p>
 */
@Entity
@Table(name = "evaluation_aggregation")
@Getter
@Setter
public class ScoreAggregation {

    @Id
    @Column(name = "aggregation_id")
    private UUID aggregationId;

    @Column(name = "cycle_id", nullable = false, unique = true)
    private UUID cycleId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "aggregation_status")
    private AggregationStatus status = AggregationStatus.PENDING;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "per_type_scores", nullable = false)
    private Map<String, Object> perTypeScores = Map.of();

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "weighting_method", nullable = false, columnDefinition = "weighting_method")
    private WeightingMethod weightingMethod = WeightingMethod.CONFIGURED;

    @Column(name = "num_assignments", nullable = false)
    private Integer numAssignments = 0;

    @Column(name = "disagreement_flag", nullable = false)
    private boolean disagreementFlag = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "disagreement_details")
    private Map<String, Object> disagreementDetails;

    @Column(name = "aggregated_at")
    private Instant aggregatedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (aggregationId == null) {
            aggregationId = UUID.randomUUID();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (status == null) {
            status = AggregationStatus.PENDING;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
