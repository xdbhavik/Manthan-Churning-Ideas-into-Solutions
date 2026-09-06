package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.AccountVerificationStatus;
import com.EDITH.SIH26043.enums.SourceAccountStatus;
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
import java.util.UUID;

/**
 * The ownership spine between a verified source and its problems.
 *
 * <p>Created only by {@code RegistrationReviewService.approve()}, one per
 * approved registration, and from then on it is the handle every submission
 * quotes: 1 SOURCE : N PROBLEMS. {@link #sourceId} points at the materialized
 * {@link ProblemSource} profile (the "who are they" data) while this row holds
 * the "may they submit" answer, so the two questions can never drift apart.</p>
 *
 * <p>A problem is accepted only when {@link #status} is
 * {@link SourceAccountStatus#ACTIVE} and {@link #verificationStatus} is
 * {@link AccountVerificationStatus#VERIFIED}; anything else is a 403.</p>
 */
@Entity
@Table(name = "source_account")
@Getter
@Setter
public class SourceAccount {

    @Id
    @Column(name = "source_account_id")
    private UUID sourceAccountId;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    /** Materialized profile row; UNIQUE, so one account per source. */
    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    /** Registration this account came from; null only for pre-V9 backfilled rows. */
    @Column(name = "registration_id")
    private UUID registrationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_bucket", nullable = false, columnDefinition = "source_bucket")
    private SourceBucket sourceBucket;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_type", nullable = false, columnDefinition = "sub_entity_type")
    private SubEntityType sourceType;

    /** Organization or contact name, denormalized for account pickers. */
    @Column(name = "display_name", length = 255)
    private String displayName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "source_account_status")
    private SourceAccountStatus status = SourceAccountStatus.PENDING;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "verification_status", nullable = false,
            columnDefinition = "account_verification_status")
    private AccountVerificationStatus verificationStatus = AccountVerificationStatus.UNVERIFIED;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    /** True only when this account may submit problems. */
    public boolean canSubmit() {
        return status == SourceAccountStatus.ACTIVE
                && verificationStatus == AccountVerificationStatus.VERIFIED;
    }

    @PrePersist
    void onCreate() {
        if (sourceAccountId == null) {
            sourceAccountId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = SourceAccountStatus.PENDING;
        }
        if (verificationStatus == null) {
            verificationStatus = AccountVerificationStatus.UNVERIFIED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
