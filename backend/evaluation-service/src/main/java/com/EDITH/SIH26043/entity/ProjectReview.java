package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.ProjectReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
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
 * A portal project submission opened as a review work item in the evaluator
 * queue. It is assigned to the SAME evaluator who scored the problem's cycle
 * ({@code evaluatorProfileId} + its {@code reviewerUserId}) for continuity.
 *
 * <p>The portal owns submissions and file bytes in {@code sih_portal};
 * {@code submissionId} is a plain UUID here and {@code files} is a metadata-only
 * JSONB snapshot {@code [{fileId, fileName, sizeBytes, contentType}]}. The
 * evaluator console downloads the actual bytes back through the portal.</p>
 */
@Entity
@Table(name = "project_review")
@Getter
@Setter
public class ProjectReview {

    @Id
    @Column(name = "project_review_id")
    private UUID projectReviewId;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "round", nullable = false)
    private int round = 1;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "evaluator_profile_id", nullable = false)
    private UUID evaluatorProfileId;

    /** The source-service user id of the reviewer (the profile's user). */
    @Column(name = "reviewer_user_id", nullable = false)
    private UUID reviewerUserId;

    @Column(name = "problem_title", nullable = false, length = 500)
    private String problemTitle;

    @Column(name = "submission_title", length = 255)
    private String submissionTitle;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    /** Extra reference links as {@code [{label, url}]}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "links", nullable = false)
    private List<Map<String, String>> links = new ArrayList<>();

    /** File metadata snapshot {@code [{fileId, fileName, sizeBytes, contentType}]}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "files", nullable = false)
    private List<Map<String, Object>> files = new ArrayList<>();

    /** Snapshot of problem, submitter/team and structured solution details. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "context", nullable = false)
    private Map<String, Object> context = new java.util.LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "project_review_status")
    private ProjectReviewStatus status = ProjectReviewStatus.ASSIGNED;

    @Column(name = "decision_comment", columnDefinition = "text")
    private String decisionComment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (projectReviewId == null) {
            projectReviewId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = ProjectReviewStatus.ASSIGNED;
        }
        if (links == null) {
            links = new ArrayList<>();
        }
        if (files == null) {
            files = new ArrayList<>();
        }
        if (context == null) {
            context = new java.util.LinkedHashMap<>();
        }
    }
}
