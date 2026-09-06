package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

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

    /**
     * Appends an immutable audit row inside the caller's transaction (REQUIRED).
     *
     * <p>This must NOT be REQUIRES_NEW: a newly created {@link Problem} is only a
     * pending insert in the caller's transaction, invisible to a separate audit
     * transaction until the outer commit. An audit row written in its own
     * transaction would violate {@code audit_log_problem_id_fkey} for brand-new
     * problems. Joining the caller's transaction keeps the audit row atomic with
     * the fact it records and lets Hibernate flush the parent before the child.</p>
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void record(UUID problemId, AuditAction action, UUID performedByUserId,
                       Problem before, Problem after, String ipAddress) {
        record(problemId, action, performedByUserId,
                before == null ? null : snapshot(before),
                after == null ? null : snapshot(after),
                ipAddress);
    }

    /**
     * Phase 2 overload: snapshots are supplied directly as maps. The evaluation
     * engine's aggregates ({@code EvaluationCycle}, {@code EvaluationAssignment},
     * ...) are not {@link Problem}s, so each service converts its own state via
     * the Boot-managed ObjectMapper (handles {@code Instant} fields).
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void record(UUID problemId, AuditAction action, UUID performedByUserId,
                       Map<String, Object> before, Map<String, Object> after,
                       String ipAddress) {
        AuditLog log = new AuditLog();
        log.setProblemId(problemId);
        log.setActionType(action);
        log.setPerformedByUserId(performedByUserId);
        log.setPerformedAt(Instant.now());
        log.setBeforeState(before);
        log.setAfterState(after);
        log.setIpAddress(ipAddress);
        auditLogRepository.save(log);
    }

    private static final TypeReference<Map<String, Object>> SNAPSHOT_TYPE =
            new TypeReference<>() {
            };

    private Map<String, Object> snapshot(Problem p) {
        // Must be the Boot-managed Jackson 3 mapper: it handles the Instant
        // fields (submittedAt/updatedAt) that a bare Jackson 2 mapper rejects.
        return objectMapper.convertValue(p, SNAPSHOT_TYPE);
    }
}