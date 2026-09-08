package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.JobStatus;
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
 * DB-backed queue row for one evaluation. Claimed atomically by a worker
 * (optimistic {@code @Version}); a stale {@code CLAIMED} row is reclaimed after
 * the configured timeout so a dead worker cannot wedge an evaluation forever.
 * One job row per evaluation (UNIQUE evaluation_id).
 */
@Entity
@Table(name = "evaluation_job")
@Getter
@Setter
public class EvaluationJob {

    @Id
    @Column(name = "job_id")
    private UUID jobId;

    @Column(name = "evaluation_id", nullable = false, unique = true)
    private UUID evaluationId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "job_status")
    private JobStatus status = JobStatus.QUEUED;

    @Column(name = "priority", nullable = false)
    private int priority = 5;

    @Column(name = "claim_owner", length = 120)
    private String claimOwner;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (jobId == null) {
            jobId = UUID.randomUUID();
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
