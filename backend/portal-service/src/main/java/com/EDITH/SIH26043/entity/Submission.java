package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.SubmissionStatus;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A solution attempt against a published problem. {@code teamId} is null for an
 * individual submission. The status lifecycle runs
 * DRAFT → UNDER_REVIEW → ACCEPTED | RETURNED; a RETURNED submission is edited and
 * resubmitted, which bumps {@code reviewRound} and opens a fresh round with the
 * same evaluator ({@code reviewerUserId}).
 */
@Entity
@Table(name = "submission")
@Getter
@Setter
public class Submission {

    @Id
    @Column(name = "submission_id")
    private UUID submissionId;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "submitter_participant_id", nullable = false)
    private UUID submitterParticipantId;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    /**
     * The exact commit judged for this round. Required at submit time when a
     * {@code githubUrl} is present — pinning is what stops a later push from
     * silently changing what was evaluated.
     */
    @Column(name = "commit_sha", length = 64)
    private String commitSha;

    /** Optional branch the pinned commit came from (context for the report). */
    @Column(name = "branch", length = 120)
    private String branch;

    /** Extra reference links as {@code [{label, url}]}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "links", nullable = false)
    private List<Map<String, String>> links = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "submission_status")
    private SubmissionStatus status = SubmissionStatus.DRAFT;

    @Column(name = "review_round", nullable = false)
    private int reviewRound = 0;

    /** evaluation-service reviewer (source-service user id) for the current round. */
    @Column(name = "reviewer_user_id")
    private UUID reviewerUserId;

    @Column(name = "decision_comment", columnDefinition = "text")
    private String decisionComment;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

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
        if (status == null) {
            status = SubmissionStatus.DRAFT;
        }
        if (links == null) {
            links = new ArrayList<>();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
