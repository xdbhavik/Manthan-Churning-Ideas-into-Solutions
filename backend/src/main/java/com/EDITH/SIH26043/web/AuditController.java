package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Submission audit trail (REVIEWER+, doc 11 sec 1). */
@Tag(name = OpenApiConfig.TAG_AUDIT)
@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Operation(
            summary = "📜 Problem audit trail",
            description = """
                    🔒 **REVIEWER / ADMIN only**
                    Returns the **full, immutable** chronological history of every mutation  
                    on a given problem: who touched it, when, from what IP, and the  
                    `before / after` JSON snapshots where captured.

                    Actions: CREATED · UPDATED · STATUS_CHANGED · EVIDENCE_ADDED ·  
                    SOURCE_VERIFICATION_INITIATED · SOURCE_VERIFIED ·  
                    SOURCE_VERIFICATION_FAILED · REJECTED · ARCHIVED · WITHDRAWN.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chronological audit entries (oldest first)"),
            @ApiResponse(responseCode = "403", description = "Insufficient role")
    })
    @GetMapping("/{problemId}")
    @PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
    public List<AuditLog> byProblem(
            @Parameter(description = "Problem UUID", required = true)
            @PathVariable UUID problemId) {
        return auditLogRepository.findByProblemIdOrderByPerformedAtAsc(problemId);
    }
}