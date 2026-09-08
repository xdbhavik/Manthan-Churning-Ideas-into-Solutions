package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A submitted project repository pinned to a commit. Created fast at intake
 * (inside the create request); the long-running evaluation happens later on the
 * DB-backed job queue. {@code commitSha} is mandatory — a moving branch HEAD must
 * never silently change what was evaluated.
 */
@Entity
@Table(name = "project_submission")
@Getter
@Setter
public class ProjectSubmission {

    @Id
    @Column(name = "submission_id")
    private UUID submissionId;

    /** Portal submission id (plain UUID) when the Innovation Portal hands off, else null. */
    @Column(name = "portal_submission_id")
    private UUID portalSubmissionId;

    /** Upstream problem-service problem id (plain UUID). */
    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    /** Problem-title snapshot for the report (fallback when problem-service is unreachable). */
    @Column(name = "problem_title", length = 255)
    private String problemTitle;

    @Column(name = "team_id")
    private UUID teamId;

    /** source-service user id (JWT subject) that created the submission. */
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Column(name = "repository_url", nullable = false, length = 500)
    private String repositoryUrl;

    @Column(name = "branch", length = 120)
    private String branch;

    @Column(name = "commit_sha", nullable = false, length = 64)
    private String commitSha;

    @Column(name = "demo_url", length = 500)
    private String demoUrl;

    @Column(name = "documentation_url", length = 500)
    private String documentationUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (submissionId == null) {
            submissionId = UUID.randomUUID();
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
