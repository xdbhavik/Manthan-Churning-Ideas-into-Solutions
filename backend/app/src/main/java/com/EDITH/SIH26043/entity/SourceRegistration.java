package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Registration request for a problem source (workflow aggregate).
 *
 * <p>Draft data lives in {@code source_payload} (JSONB) and is only mapped
 * onto the correct {@link ProblemSource} JOINED subclass (via SourceMapper)
 * when a reviewer approves. {@code source_id} then links the activated source
 * account back to this registration.</p>
 *
 * <p>Optimistic locking via {@code @Version}; concurrent reviewer decisions
 * get a 409 on a stale version.</p>
 */
@Entity
@Table(name = "source_registration")
@Getter
@Setter
public class SourceRegistration {

    @Id
    @Column(name = "registration_id")
    private UUID registrationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_bucket", nullable = false, columnDefinition = "source_bucket")
    private SourceBucket sourceBucket;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_type", nullable = false, columnDefinition = "sub_entity_type")
    private SubEntityType sourceType;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "registration_status")
    private RegistrationStatus status = RegistrationStatus.DRAFT;

    /** Type-specific draft fields; keys match entity property names (camelCase). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> sourcePayload = new HashMap<>();

    @Column(name = "submitted_by_user_id", nullable = false)
    private UUID submittedByUserId;

    /** Populated only after approval (materialized source account). */
    @Column(name = "source_id")
    private UUID sourceId;

    @Column(name = "assigned_reviewer_id")
    private UUID assignedReviewerId;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "action_required_comment", columnDefinition = "text")
    private String actionRequiredComment;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (registrationId == null) {
            registrationId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = RegistrationStatus.DRAFT;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
