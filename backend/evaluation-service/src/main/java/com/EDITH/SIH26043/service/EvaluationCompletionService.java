package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Runs aggregation + prioritisation as soon as a cycle completes, so a problem
 * that was fully evaluated by the machine needs nobody to press a button.
 *
 * <p><b>Deliberately not {@code @Transactional}.</b> This is called after the
 * caller's own transaction has committed (the scorecard write, or the analysis +
 * routing pass), so it cannot join that transaction and must not be able to roll
 * it back — a failure here would otherwise turn a successful submission into a
 * 500. Each of {@link ScoreAggregationService#aggregate} and
 * {@link PrioritizationService#prioritize} therefore commits in its own
 * transaction, and a failure leaves the cycle parked at {@code EVALUATION_COMPLETED}
 * or {@code SCORES_AGGREGATED} where {@code POST …/aggregate} / {@code …/prioritize}
 * can finish the job.</p>
 *
 * <p>This is the same best-effort contract the portal publish gate uses, and it
 * exists for the same reason. Like that gate it is a no-op unless the cycle is
 * actually {@code EVALUATION_COMPLETED} — so a retry, or a manual re-aggregation
 * that deliberately moved the cycle backwards, is never clobbered.</p>
 */
@Service
public class EvaluationCompletionService {

    private static final Logger log = LoggerFactory.getLogger(EvaluationCompletionService.class);

    /** Machine-triggered work is attributed the way the publish gate does it. */
    private static final String INTERNAL_IP = "internal";

    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final ScoreAggregationService aggregationService;
    private final PrioritizationService prioritizationService;

    public EvaluationCompletionService(EvaluationCycleRepository cycleRepository,
                                       EvaluationAssignmentRepository assignmentRepository,
                                       ScoreAggregationService aggregationService,
                                       PrioritizationService prioritizationService) {
        this.cycleRepository = cycleRepository;
        this.assignmentRepository = assignmentRepository;
        this.aggregationService = aggregationService;
        this.prioritizationService = prioritizationService;
    }

    /**
     * Advances the cycle if it is complete. Never throws: every failure is logged
     * and left for the explicit endpoints.
     *
     * @param origin which step completed the cycle ("analyze", "route-pools",
     *               "submit") — log context only
     */
    public void runBestEffort(UUID cycleId, String origin) {
        if (cycleId == null) {
            return;
        }
        try {
            advance(cycleId, origin);
        } catch (RuntimeException ex) {
            log.warn("Aggregation after {} skipped (cycle {}): {}", origin, cycleId, ex.toString());
        }
    }

    /**
     * The same pass, addressed by assignment — the evaluator submit path knows the
     * assignment it just scored, not the cycle behind it (mirrors
     * {@code PortalPublishService.publishCompletedCycleByAssignment}).
     */
    public void runBestEffortForAssignment(UUID assignmentId, String origin) {
        if (assignmentId == null) {
            return;
        }
        try {
            UUID cycleId = assignmentRepository.findById(assignmentId)
                    .map(EvaluationAssignment::getCycleId)
                    .orElse(null);
            if (cycleId == null) {
                log.warn("Aggregation after {} skipped: assignment {} not found", origin, assignmentId);
                return;
            }
            advance(cycleId, origin);
        } catch (RuntimeException ex) {
            log.warn("Aggregation after {} skipped (assignment {}): {}", origin, assignmentId,
                    ex.toString());
        }
    }

    private void advance(UUID cycleId, String origin) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId).orElse(null);
        if (cycle == null || cycle.getStatus() != EvaluationStatus.EVALUATION_COMPLETED) {
            return;
        }
        UUID actor = cycle.getTriggeredByUserId();
        aggregationService.aggregate(cycleId, actor, INTERNAL_IP);
        // Locked decision: a disagreement flag is recorded on the aggregation row for a
        // human to read, it does not park the problem. Full autonomy was the owner's rule.
        prioritizationService.prioritize(cycleId, actor, INTERNAL_IP);
        log.info("Cycle {} aggregated and prioritised after {}", cycleId, origin);
    }
}
