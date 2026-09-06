package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.DisagreementStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A disagreement flag raised when an assignment's score deviates from its type's
 * mean beyond the configured threshold. Carries the resolution trail.
 */
@Entity
@Table(name = "evaluation_disagreement")
@Getter
@Setter
public class EvaluationDisagreement {

    @Id
    @Column(name = "disagreement_id")
    private UUID disagreementId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "evaluator_profile_id")
    private UUID evaluatorProfileId;

    @Column(name = "deviation_score", nullable = false, precision = 6, scale = 2)
    private BigDecimal deviationScore;

    @Column(name = "threshold", nullable = false, precision = 6, scale = 2)
    private BigDecimal threshold;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "disagreement_status")
    private DisagreementStatus status = DisagreementStatus.OPEN;

    /** REVIEWED | RE_EVALUATE | ADD_EVALUATOR | ESCALATED | IGNORED. */
    @Column(name = "action_taken", length = 50)
    private String actionTaken;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "resolved_by_user_id")
    private UUID resolvedByUserId;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (disagreementId == null) {
            disagreementId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = DisagreementStatus.OPEN;
        }
    }
}
