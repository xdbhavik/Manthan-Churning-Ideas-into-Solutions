package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** One independent, resumable scorecard per submitted project review. */
@Entity
@Table(name = "project_review_scorecard")
@Getter
@Setter
public class ProjectReviewScorecard {
    @Id
    @Column(name = "project_review_id")
    private UUID projectReviewId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "criteria_scores", nullable = false)
    private Map<String, Object> criteriaScores = new LinkedHashMap<>();

    @Column(name = "overall_remarks", columnDefinition = "text")
    private String overallRemarks;

    @Column(name = "total_score", nullable = false)
    private int totalScore;

    @Column(name = "max_score", nullable = false)
    private int maxScore;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @PrePersist
    void beforeInsert() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (criteriaScores == null) criteriaScores = new LinkedHashMap<>();
    }

    @PreUpdate
    void beforeUpdate() { updatedAt = Instant.now(); }
}
