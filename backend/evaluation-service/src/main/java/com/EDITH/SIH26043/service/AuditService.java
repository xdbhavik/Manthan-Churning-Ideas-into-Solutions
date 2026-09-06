package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Appends immutable audit rows inside the caller's transaction (REQUIRED), so an
 * audit entry is atomic with the fact it records.
 *
 * <p>Generic subject: each service that owns this table passes an
 * {@code entityType} + {@code entityId}. The evaluation pipeline records against
 * the problem being evaluated.</p>
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void record(String entityType, UUID entityId, AuditAction action,
                       UUID performedByUserId, Map<String, Object> before,
                       Map<String, Object> after, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setActionType(action);
        log.setPerformedByUserId(performedByUserId);
        log.setBeforeState(before);
        log.setAfterState(after);
        log.setIpAddress(ipAddress);
        log.setPerformedAt(Instant.now());
        auditLogRepository.save(log);
    }
}
