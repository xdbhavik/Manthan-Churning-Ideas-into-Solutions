package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.repository.AuditLogRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Submission audit trail (REVIEWER+, doc 11 sec 1). */
@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/{problemId}")
    @PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
    public List<AuditLog> byProblem(@PathVariable UUID problemId) {
        return auditLogRepository.findByProblemIdOrderByPerformedAtAsc(problemId);
    }
}