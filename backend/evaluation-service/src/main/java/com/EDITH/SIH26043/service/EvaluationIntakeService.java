package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 2 intake: validates a problem is eligible for evaluation and opens the
 * single {@link EvaluationCycle} for it.
 *
 * <p>Eligibility (doc plan §3): {@code problem.status == REGISTERED} and no
 * in-flight/duplicate cycle for the same problem. The problem row itself is not
 * stored in this service's database — eligibility is checked against the
 * problem-service snapshot fetched via {@link ProblemContextGateway}, and the
 * cycle is created in {@code RECEIVED} with a history row plus an audit entry.</p>
 */
@Service
public class EvaluationIntakeService {

    private final ProblemContextGateway problemGateway;
    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationStatusHistoryRepository historyRepository;
    private final AuditService auditService;

    public EvaluationIntakeService(ProblemContextGateway problemGateway,
                                   EvaluationCycleRepository cycleRepository,
                                   EvaluationStatusHistoryRepository historyRepository,
                                   AuditService auditService) {
        this.problemGateway = problemGateway;
        this.cycleRepository = cycleRepository;
        this.historyRepository = historyRepository;
        this.auditService = auditService;
    }

    @Transactional
    public EvaluationCycle start(UUID problemId, UUID actorUserId, String ipAddress) {
        ProblemContextResponse problem = problemGateway.fetch(problemId);

        if (ProblemStatus.valueOf(problem.status()) != ProblemStatus.REGISTERED) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "INVALID_PROBLEM_STATUS: problem " + problemId
                            + " is " + problem.status() + ", only REGISTERED problems can be evaluated");
        }
        if (cycleRepository.existsByProblemId(problemId)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "DUPLICATE_EVALUATION: a cycle already exists for problem " + problemId);
        }

        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setProblemId(problemId);
        cycle.setStatus(EvaluationStatus.RECEIVED);
        cycle.setTriggerMethod("ADMIN");
        cycle.setTriggeredByUserId(actorUserId);
        cycle.setStartedAt(Instant.now());
        // Reassign: save() on a new entity whose @Version is pre-set (1) goes through
        // merge(), which returns a managed copy — the original stays transient with a
        // null cycleId until flush. The returned copy has its @PrePersist id assigned.
        cycle = cycleRepository.save(cycle);

        appendInitialHistory(cycle, actorUserId);

        auditService.record("PROBLEM", problemId, AuditAction.EVALUATION_STARTED, actorUserId,
                null, snapshot(cycle), ipAddress);
        return cycle;
    }

    private void appendInitialHistory(EvaluationCycle cycle, UUID actorUserId) {
        EvaluationStatusHistory history = new EvaluationStatusHistory();
        history.setCycleId(cycle.getCycleId());
        history.setFromStatus(null);
        history.setToStatus(EvaluationStatus.RECEIVED);
        history.setChangedByUserId(actorUserId);
        history.setComment("Evaluation cycle opened");
        history.setChangedAt(cycle.getStartedAt());
        historyRepository.save(history);
    }

    private Map<String, Object> snapshot(EvaluationCycle cycle) {
        // HashMap (not Map.of): under a mocked repository @PrePersist has not run yet,
        // so cycleId may be null; Map.of would throw on null values.
        Map<String, Object> snap = new java.util.HashMap<>();
        snap.put("cycleId", cycle.getCycleId());
        snap.put("problemId", cycle.getProblemId());
        snap.put("status", cycle.getStatus() == null ? null : cycle.getStatus().name());
        snap.put("triggerMethod", cycle.getTriggerMethod());
        snap.put("startedAt", cycle.getStartedAt());
        return snap;
    }
}
