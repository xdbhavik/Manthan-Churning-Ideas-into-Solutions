package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.ParticipantType;
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
 * Portal participant bound 1:1 to a source-service user id (the shared-claim JWT
 * subject). No second registration for institutions already in source-service:
 * a UNIVERSITY participant is auto-created on first contact when the caller owns
 * an ACTIVE + VERIFIED HEI source account, carrying the institution-name snapshot
 * used for {@code SELECTED_UNIVERSITIES} matching.
 */
@Entity
@Table(name = "participant")
@Getter
@Setter
public class Participant {

    @Id
    @Column(name = "participant_id")
    private UUID participantId;

    /** source-service user id (JWT subject). */
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "participant_type", nullable = false, columnDefinition = "participant_type")
    private ParticipantType participantType;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    /** UNIVERSITY only: HEI institution snapshot for SELECTED_UNIVERSITIES matching. */
    @Column(name = "institution_name", length = 255)
    private String institutionName;

    /** UNIVERSITY only: the source account that auto-bound this participant. */
    @Column(name = "source_account_id")
    private UUID sourceAccountId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (participantId == null) {
            participantId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
