package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.PortalGateway;
import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Publishes a fully-evaluated problem to the portal catalog. Fired automatically
 * the moment a cycle reaches {@code EVALUATION_COMPLETED} (from the evaluator
 * submit controller, outside the scoring transaction) and re-runnable by an
 * ADMIN/REVIEWER for a completed cycle when the automatic push failed.
 *
 * <p>The push is safe to repeat: portal-service upserts the published row
 * idempotently on the upstream {@code problemId}.</p>
 */
@Service
public class PortalPublishService {

    private static final Logger log = LoggerFactory.getLogger(PortalPublishService.class);

    private static final EnumSet<EvaluationStatus> PUBLISHABLE_STATUSES = EnumSet.of(
            EvaluationStatus.EVALUATION_COMPLETED,
            EvaluationStatus.SCORES_AGGREGATED,
            EvaluationStatus.PRIORITIZED,
            EvaluationStatus.PHASE_3_READY);

    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluationCycleRepository cycleRepository;
    private final ProblemContextGateway problemGateway;
    private final PortalGateway portalGateway;
    private final AuditService auditService;

    public PortalPublishService(EvaluationAssignmentRepository assignmentRepository,
                                EvaluationCycleRepository cycleRepository,
                                ProblemContextGateway problemGateway,
                                PortalGateway portalGateway,
                                AuditService auditService) {
        this.assignmentRepository = assignmentRepository;
        this.cycleRepository = cycleRepository;
        this.problemGateway = problemGateway;
        this.portalGateway = portalGateway;
        this.auditService = auditService;
    }

    /**
     * Resolves the just-scored assignment to its cycle and publishes when the
     * cycle has in fact completed. Called from the evaluator submit controller
     * AFTER the scorecard transaction committed, so a portal outage never rolls
     * the scorecard back.
     */
    public void publishCompletedCycleByAssignment(UUID assignmentId) {
        EvaluationAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElse(null);
        if (assignment == null) {
            log.warn("Publish skipped: assignment {} not found", assignmentId);
            return;
        }
        publishCompletedCycle(assignment.getCycleId());
    }

    /**
     * Publishes a completed cycle to the portal. The caller decides how failures
     * surface: the automatic path swallows them (best effort), the manual
     * ADMIN/REVIEWER endpoint lets the exception propagate so a failed retry is
     * visible.
     *
     * @throws ApiException 404 when the cycle is unknown, 409 when it has not yet
     *                      reached EVALUATION_COMPLETED, or 502/503 when the
     *                      portal push fails.
     */
    public void publishCompletedCycle(UUID cycleId) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));
        if (!PUBLISHABLE_STATUSES.contains(cycle.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cycle " + cycleId + " is " + cycle.getStatus()
                            + "; only a completed cycle can be published to the portal");
        }

        ProblemContextResponse snapshot = problemGateway.fetch(cycle.getProblemId());
        portalGateway.publish(cycle.getCycleId(), snapshot);

        Map<String, Object> after = new HashMap<>();
        after.put("problemId", cycle.getProblemId());
        after.put("cycleId", cycle.getCycleId());
        after.put("status", cycle.getStatus().name());
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.PROBLEM_PUBLISHED,
                cycle.getTriggeredByUserId(), Map.of("status", cycle.getStatus().name()),
                after, "internal");
        log.info("Published problem {} (cycle {}) to portal", cycle.getProblemId(), cycleId);
    }
}
