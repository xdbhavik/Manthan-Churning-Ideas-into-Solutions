package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ProblemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Map;
import java.util.UUID;

/**
 * Enforces the Phase 1 status transition rules (doc 11, sec 1) with optimistic
 * locking (doc 05, sec 13) and appends an audit entry after every transition.
 */
@Service
public class ProblemStatusService {

    private final ProblemRepository problemRepository;
    private final AuditService auditService;

    public ProblemStatusService(ProblemRepository problemRepository, AuditService auditService) {
        this.problemRepository = problemRepository;
        this.auditService = auditService;
    }

    private static final Map<ProblemStatus, EnumSet<ProblemStatus>> ALLOWED = Map.of(
            ProblemStatus.SUBMITTED, EnumSet.of(
                    ProblemStatus.SOURCE_VERIFYING, ProblemStatus.REJECTED, ProblemStatus.ARCHIVED),
            ProblemStatus.SOURCE_VERIFYING, EnumSet.of(
                    ProblemStatus.SOURCE_VERIFIED, ProblemStatus.REJECTED),
            ProblemStatus.SOURCE_VERIFIED, EnumSet.of(
                    ProblemStatus.REGISTERED, ProblemStatus.SUBMITTED)
    );

    @Transactional
    public Problem transition(UUID problemId, ProblemStatus target, UUID actor,
                              Integer expectedVersion, String ip) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Problem " + problemId + " not found"));

        ProblemStatus current = problem.getStatus();
        if (expectedVersion != null && !expectedVersion.equals(problem.getVersion())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Stale version " + problem.getVersion() + "; expected " + expectedVersion);
        }
        if (current == target) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Already in status " + target);
        }
        EnumSet<ProblemStatus> allowed = ALLOWED.get(current);
        if (allowed == null || !allowed.contains(target)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Illegal transition " + current + " -> " + target);
        }

        Problem before = copy(problem);
        problem.setStatus(target);
        problemRepository.save(problem);

        AuditAction action = switch (target) {
            case REJECTED -> AuditAction.REJECTED;
            case ARCHIVED -> AuditAction.ARCHIVED;
            default -> AuditAction.STATUS_CHANGED;
        };
        auditService.record(problemId, action, actor, before, problem, ip);
        return problem;
    }

    private Problem copy(Problem src) {
        Problem c = new Problem();
        c.setStatus(src.getStatus());
        c.setTitle(src.getTitle());
        c.setVersion(src.getVersion());
        c.setSourceBucket(src.getSourceBucket());
        return c;
    }
}