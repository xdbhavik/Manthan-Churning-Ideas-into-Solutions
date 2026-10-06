package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.ProblemAccessRule;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A problem statement published to the portal after its evaluation cycle reaches
 * {@code EVALUATION_COMPLETED}. One row per problem: the PRIMARY KEY is the
 * upstream problem-service problem id, so publish is a natural idempotent UPSERT.
 *
 * <p>{@code accessRule} / {@code accessUniversities} are a snapshot of the
 * problem's access rule and decide which participants may see/solve it
 * (STUDENT → OPEN_TO_ALL only; UNIVERSITY → OPEN_TO_ALL / UNIVERSITY_ONLY /
 * SELECTED naming its institution).</p>
 */
@Entity
@Table(name = "published_problem")
@Getter
@Setter
public class PublishedProblem {

    /** Upstream problem-service problem id (NOT generated here). */
    @Id
    @Column(name = "problem_id")
    private UUID problemId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    /** Original source submitter; used to grant that source access to accepted solutions. */
    @Column(name = "submitted_by_user_id")
    private UUID submittedByUserId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "expected_outcome", columnDefinition = "text")
    private String expectedOutcome;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source_bucket", nullable = false, columnDefinition = "source_bucket")
    private SourceBucket sourceBucket;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sub_entity_type", nullable = false, columnDefinition = "sub_entity_type")
    private SubEntityType subEntityType;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "urgency", nullable = false, columnDefinition = "urgency")
    private Urgency urgency;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", columnDefinition = "severity")
    private Severity severity;

    /** Human-readable location line from the problem snapshot. */
    @Column(name = "location", length = 500)
    private String location;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "domains", nullable = false)
    private List<String> domains = new ArrayList<>();

    @Column(name = "evidence_count", nullable = false)
    private int evidenceCount;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "access_rule", nullable = false, columnDefinition = "access_rule")
    private ProblemAccessRule accessRule = ProblemAccessRule.OPEN_TO_ALL;

    /** University-name snapshot honoured when {@code accessRule == SELECTED_UNIVERSITIES}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "access_universities", nullable = false)
    private List<String> accessUniversities = new ArrayList<>();

    @Column(name = "velocity_index")
    private Integer velocityIndex;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "velocity_history")
    private List<Integer> velocityHistory;

    @Column(name = "prize_pool")
    private Integer prizePool;

    @Column(name = "teams_active")
    private Integer teamsActive;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (publishedAt == null) {
            publishedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (accessRule == null) {
            accessRule = ProblemAccessRule.OPEN_TO_ALL;
        }
        if (domains == null) {
            domains = new ArrayList<>();
        }
        if (accessUniversities == null) {
            accessUniversities = new ArrayList<>();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
