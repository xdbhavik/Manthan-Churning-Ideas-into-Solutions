package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.enums.Severity;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.Urgency;
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
import java.util.Map;
import java.util.UUID;

/**
 * Central canonical record for every submitted problem (immutable core).
 * Refs: 05-data-dictionary-common.md (sec 1), 03-class-diagram.md.
 *
 * <p>Optimistic locking via {@code @Version}; concurrent reviewers get a 409 on
 * stale version (doc 05, sec 13).</p>
 */
@Entity
@Table(name = "problem")
@Getter
@Setter
public class Problem {

    @Id
    @Column(name = "problem_id")
    private UUID problemId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    /** Denormalized from the linked source for query performance (doc 11 sec 2). */
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_bucket", nullable = false, columnDefinition = "source_bucket")
    private SourceBucket sourceBucket;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sub_entity_type", nullable = false, columnDefinition = "sub_entity_type")
    private SubEntityType subEntityType;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "problem_status")
    private ProblemStatus status = ProblemStatus.SUBMITTED;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "urgency", nullable = false, columnDefinition = "urgency")
    private Urgency urgency;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", columnDefinition = "severity")
    private Severity severity;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    /**
     * Verified account this problem was submitted under (1 SOURCE : N PROBLEMS).
     * Nullable only for pre-V9 rows, which were created before the spine existed.
     */
    @Column(name = "source_account_id")
    private UUID sourceAccountId;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "affected_population")
    private Integer affectedPopulation;

    @Column(name = "expected_outcome", columnDefinition = "text")
    private String expectedOutcome;

    @Column(name = "existing_intervention", columnDefinition = "text")
    private String existingIntervention;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "submitted_by_user_id")
    private UUID submittedByUserId;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    /** Extensible JSONB for unrecognized fields (doc 11, sec 4). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;

    @PrePersist
    void onCreate() {
        if (problemId == null) {
            problemId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (submittedAt == null) {
            submittedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = ProblemStatus.SUBMITTED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}