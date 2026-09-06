package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.RegistrationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit trail of registration status transitions. Every create,
 * submit, assignment and reviewer decision appends one row; rows are never
 * updated (doc: reviewer decisions must be reconstructable).
 */
@Entity
@Table(name = "registration_status_history")
@Getter
@Setter
public class RegistrationStatusHistory {

    @Id
    @Column(name = "history_id")
    private UUID historyId;

    @Column(name = "registration_id", nullable = false)
    private UUID registrationId;

    /** Null for the initial DRAFT row. */
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "from_status", columnDefinition = "registration_status")
    private RegistrationStatus fromStatus;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "to_status", nullable = false, columnDefinition = "registration_status")
    private RegistrationStatus toStatus;

    @Column(name = "changed_by_user_id")
    private UUID changedByUserId;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        if (historyId == null) {
            historyId = UUID.randomUUID();
        }
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }
}
