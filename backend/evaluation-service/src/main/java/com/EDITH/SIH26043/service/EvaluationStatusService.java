package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Map;
import java.util.UUID;

/**
 * Enforces the Phase 2 evaluation-cycle state machine (mirrors
 * {@link ProblemStatusService}) and appends an append-only status-history row
 * after every transition.
 *
 * <p>Audit entries are written by the individual step services (intake, analysis,
 * routing, aggregation, prioritization) which know the meaningful
 * problem-level {@code AuditAction} for their step; this service owns the
 * cycle-scoped history trail only.</p>
 */
@Service
public class EvaluationStatusService {

    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationStatusHistoryRepository historyRepository;

    public EvaluationStatusService(EvaluationCycleRepository cycleRepository,
                                   EvaluationStatusHistoryRepository historyRepository) {
        this.cycleRepository = cycleRepository;
        this.historyRepository = historyRepository;
    }

    private static final Map<EvaluationStatus, EnumSet<EvaluationStatus>> ALLOWED = Map.ofEntries(
            Map.entry(EvaluationStatus.RECEIVED, EnumSet.of(EvaluationStatus.ANALYZING)),
            Map.entry(EvaluationStatus.ANALYZING, EnumSet.of(
                    EvaluationStatus.ROUTING, EvaluationStatus.ANALYSIS_FAILED)),
            // Analysis failed → retry the analysis step (no audit loop).
            Map.entry(EvaluationStatus.ANALYSIS_FAILED, EnumSet.of(EvaluationStatus.ANALYZING)),
            Map.entry(EvaluationStatus.ROUTING, EnumSet.of(EvaluationStatus.EVALUATION_IN_PROGRESS,
                    EvaluationStatus.REJECTED)),
            // Back to ROUTING when every assignment was declined/expired — the problem is
            // still unevaluated, so it must be re-routable to a different evaluator.
            Map.entry(EvaluationStatus.EVALUATION_IN_PROGRESS, EnumSet.of(
                    EvaluationStatus.EVALUATION_COMPLETED, EvaluationStatus.ROUTING,
                    EvaluationStatus.REJECTED)),
            Map.entry(EvaluationStatus.REJECTED, EnumSet.noneOf(EvaluationStatus.class)),
            Map.entry(EvaluationStatus.EVALUATION_COMPLETED, EnumSet.of(EvaluationStatus.SCORES_AGGREGATED)),
            // Re-aggregation after a disagreement is reviewed/resolved.
            Map.entry(EvaluationStatus.SCORES_AGGREGATED, EnumSet.of(
                    EvaluationStatus.EVALUATION_IN_PROGRESS, EvaluationStatus.PRIORITIZED)),
            Map.entry(EvaluationStatus.PRIORITIZED, EnumSet.of(EvaluationStatus.PHASE_3_READY)),
            // Terminal.
            Map.entry(EvaluationStatus.PHASE_3_READY, EnumSet.noneOf(EvaluationStatus.class))
    );

    @Transactional
    public EvaluationCycle transition(UUID cycleId, EvaluationStatus target, UUID actor,
                                      String comment) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));

        EvaluationStatus current = cycle.getStatus();
        if (current == target) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Already in status " + target);
        }
        EnumSet<EvaluationStatus> allowed = ALLOWED.get(current);
        if (allowed == null || !allowed.contains(target)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Illegal evaluation transition " + current + " -> " + target);
        }

        cycle.setStatus(target);
        if (target == EvaluationStatus.PRIORITIZED || target == EvaluationStatus.PHASE_3_READY) {
            cycle.setCompletedAt(Instant.now());
        }
        cycleRepository.save(cycle);

        appendHistory(cycleId, current, target, actor, comment);
        return cycle;
    }

    private void appendHistory(UUID cycleId, EvaluationStatus from, EvaluationStatus to,
                               UUID actor, String comment) {
        EvaluationStatusHistory history = new EvaluationStatusHistory();
        history.setCycleId(cycleId);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setChangedByUserId(actor);
        history.setComment(comment);
        history.setChangedAt(Instant.now());
        historyRepository.save(history);
    }
}
