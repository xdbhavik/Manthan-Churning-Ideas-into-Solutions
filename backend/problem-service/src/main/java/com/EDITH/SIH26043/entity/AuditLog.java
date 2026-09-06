package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.AuditAction;
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
import java.util.Map;
import java.util.UUID;

/**
 * Immutable record of every action on a problem.
 * Refs: 05-data-dictionary-common.md (sec 7).
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
public class AuditLog {

    @Id
    @Column(name = "log_id")
    private UUID logId;

    @Column(name = "problem_id")
    private UUID problemId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "action_type", nullable = false, columnDefinition = "audit_action")
    private AuditAction actionType;

    @Column(name = "performed_by_user_id")
    private UUID performedByUserId;

    @Column(name = "performed_at", nullable = false)
    private Instant performedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_state")
    private Map<String, Object> beforeState;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_state")
    private Map<String, Object> afterState;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @PrePersist
    void onCreate() {
        if (logId == null) {
            logId = UUID.randomUUID();
        }
        if (performedAt == null) {
            performedAt = Instant.now();
        }
    }
}