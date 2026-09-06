package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Minimal phone-based identity and role model.
 * Refs: 05-data-dictionary-common.md (sec 9).
 *
 * <p>{@code linkedSourceId} is optional and only populated once both the user and
 * their {@link ProblemSource} exist, avoiding a circular reference (doc 11, sec 6).</p>
 */
@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "phone", nullable = false, unique = true, length = 15)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "role", nullable = false, columnDefinition = "user_role")
    private UserRole role;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "kyc_status", nullable = false, columnDefinition = "kyc_status")
    private KycStatus kycStatus = KycStatus.UNVERIFIED;

    @Column(name = "linked_source_id")
    private UUID linkedSourceId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (userId == null) {
            userId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (role == null) {
            role = UserRole.SUBMITTER;
        }
        if (kycStatus == null) {
            kycStatus = KycStatus.UNVERIFIED;
        }
    }
}