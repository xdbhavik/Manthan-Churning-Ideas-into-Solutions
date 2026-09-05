package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvidenceType;
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
import java.util.Map;
import java.util.UUID;

/**
 * Immutable file attachment with SHA-256 integrity hash.
 * Refs: 05-data-dictionary-common.md (sec 4, 10).
 */
@Entity
@Table(name = "evidence")
@Getter
@Setter
public class Evidence {

    @Id
    @Column(name = "evidence_id")
    private UUID evidenceId;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "evidence_type", nullable = false, columnDefinition = "evidence_type")
    private EvidenceType evidenceType;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    /** SHA-256 hex digest for tamper detection and duplicate prevention. */
    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    /** file_size, dimensions, duration, geotag, mime_type. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @Column(name = "uploaded_by_user_id")
    private UUID uploadedByUserId;

    @PrePersist
    void onCreate() {
        if (evidenceId == null) {
            evidenceId = UUID.randomUUID();
        }
    }
}