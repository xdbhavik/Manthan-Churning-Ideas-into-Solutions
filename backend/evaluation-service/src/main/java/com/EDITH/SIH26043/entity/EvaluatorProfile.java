package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.EvaluatorType;
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
 * One profile per real evaluator user (1:1 with {@code users.role = 'EVALUATOR'}).
 * Carries the pool, expertise, geographic scope and workload limit used by the
 * routing service.
 */
@Entity
@Table(name = "evaluator_profile")
@Getter
@Setter
public class EvaluatorProfile {

    @Id
    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "evaluator_type", nullable = false, columnDefinition = "evaluator_type")
    private EvaluatorType evaluatorType;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "organization", length = 255)
    private String organization;

    @Column(name = "designation", length = 150)
    private String designation;

    @Column(name = "experience_years", nullable = false)
    private Integer experienceYears = 0;

    /** State names the evaluator is willing/able to evaluate (JSONB list). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "region_states", nullable = false)
    private List<String> regionStates = new ArrayList<>();

    /** Conflict-of-interest: the source the evaluator is affiliated with (if any). */
    @Column(name = "affiliated_source_id")
    private UUID affiliatedSourceId;

    @Column(name = "max_workload", nullable = false)
    private Integer maxWorkload = 5;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /**
     * True for the five seeded system AI profiles (V4), which own the scorecard of
     * an AUTO pool. Routing must never offer one to a MANUAL pool, and a project
     * review must never be parked on one — nobody can log in as an AI.
     */
    @Column(name = "is_system", nullable = false)
    private boolean system = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @PrePersist
    void onCreate() {
        if (profileId == null) {
            profileId = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (experienceYears == null) {
            experienceYears = 0;
        }
        if (maxWorkload == null) {
            maxWorkload = 5;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
