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
 * Service-local immutable audit trail with a generic {@code (entity_type,
 * entity_id)} subject. Evaluation events are recorded against the problem they
 * concern ({@code entity_type = "PROBLEM"}, {@code entity_id = problemId}) so a
 * future cross-service timeline can stitch them together.
 *
 * <p>This table lives in the {@code sih_eval} database only — it has no FK to a
 * shared audit log (the pre-split global {@code audit_log} belonged to the
 * monolith's problem database).</p>
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
public class AuditLog {

    @Id
    @Column(name = "audit_id")
    private UUID auditId;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

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

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @PrePersist
    void onCreate() {
        if (auditId == null) {
            auditId = UUID.randomUUID();
        }
        if (performedAt == null) {
            performedAt = Instant.now();
        }
    }
}
