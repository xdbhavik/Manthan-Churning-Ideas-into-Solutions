package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Appends immutable audit trail rows. Snapshot of the problem state is taken
 * as a plain map so history can be reconstructed (doc 05, sec 7).
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID problemId, AuditAction action, UUID performedByUserId,
                       Problem before, Problem after, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setProblemId(problemId);
        log.setActionType(action);
        log.setPerformedByUserId(performedByUserId);
        log.setPerformedAt(Instant.now());
        log.setBeforeState(before == null ? null : snapshot(before));
        log.setAfterState(after == null ? null : snapshot(after));
        log.setIpAddress(ipAddress);
        auditLogRepository.save(log);
    }

    private Map<String, Object> snapshot(Problem p) {
        // Getters are simple scalars/enums; convertValue keeps the snapshot small.
        return objectMapper.convertValue(p, objectMapper.getTypeFactory()
                .constructMapType(Map.class, String.class, Object.class));
    }
}