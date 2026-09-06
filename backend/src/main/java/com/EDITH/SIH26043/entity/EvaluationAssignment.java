package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.AssignmentStatus;
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
 * One evaluator's work item for a cycle. Deadlines are enforced lazily
 * (computed on read/submit — no scheduler exists in this sprint).
 */
@Entity
@Table(name = "evaluation_assignment")
@Getter
@Setter
public class EvaluationAssignment {

    @Id
    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "evaluator_profile_id", nullable = false)
    private UUID evaluatorProfileId;

    @Column(name = "assigned_by_user_id")
    private UUID assignedByUserId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "assignment_status")
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "deadline", nullable = false)
    private Instant deadline;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    /** Set when the conflict-of-interest was re-verified at submit time. */
    @Column(name = "conflict_recheck", nullable = false)
    private boolean conflictRecheck = false;

    @Column(name = "eligibility_rechecked_at")
    private Instant eligibilityRecheckedAt;

    @Column(name = "feedback", columnDefinition = "text")
    private String feedback;

    @Column(name = "recommendation", length = 255)
    private String recommendation;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (assignmentId == null) {
            assignmentId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (assignedAt == null) {
            assignedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = AssignmentStatus.ASSIGNED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
