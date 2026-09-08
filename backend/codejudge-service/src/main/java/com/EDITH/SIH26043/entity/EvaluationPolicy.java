package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.FindingSeverity;
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

/**
 * SEEDED config: severity → penalty/block rules the deterministic scoring engine
 * applies. {@code action}: PENALTY | BLOCK | NONE. Rules live here, never
 * hard-coded in the scanners.
 */
@Entity
@Table(name = "evaluation_policy")
@Getter
@Setter
public class EvaluationPolicy {

    @Id
    @Column(name = "rule_key", length = 60)
    private String ruleKey;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", columnDefinition = "finding_severity")
    private FindingSeverity severity;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }
}
