package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable metadata row for one artifact uploaded against a submission. The
 * bytes live under {@code app.portal.storage-dir} (portal-files volume);
 * {@code sha256} supports content dedupe and integrity checks. Files may only be
 * added/removed while the owning submission is DRAFT or RETURNED.
 */
@Entity
@Table(name = "submission_file")
@Getter
@Setter
public class SubmissionFile {

    @Id
    @Column(name = "file_id")
    private UUID fileId;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    /** Absolute (or storage-root-relative) path where the bytes were written. */
    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    @PrePersist
    void onCreate() {
        if (fileId == null) {
            fileId = UUID.randomUUID();
        }
        if (uploadedAt == null) {
            uploadedAt = Instant.now();
        }
    }
}
