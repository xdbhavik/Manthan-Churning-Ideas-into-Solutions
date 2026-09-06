package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.VerificationMethod;
import com.EDITH.SIH26043.enums.VerificationResult;
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
 * Records a source identity verification (never evaluates problem merit).
 * Refs: 05-data-dictionary-common.md (sec 8).
 */
@Entity
@Table(name = "source_verification")
@Getter
@Setter
public class SourceVerification {

    @Id
    @Column(name = "verification_id")
    private UUID verificationId;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "verification_method", nullable = false, columnDefinition = "verification_method")
    private VerificationMethod verificationMethod;

    @Column(name = "verified_by_user_id")
    private UUID verifiedByUserId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "result", nullable = false, columnDefinition = "verification_result")
    private VerificationResult result;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "verified_at", nullable = false)
    private Instant verifiedAt;

    @Column(name = "evidence_url", length = 500)
    private String evidenceUrl;

    @PrePersist
    void onCreate() {
        if (verificationId == null) {
            verificationId = UUID.randomUUID();
        }
        if (verifiedAt == null) {
            verifiedAt = Instant.now();
        }
    }
}