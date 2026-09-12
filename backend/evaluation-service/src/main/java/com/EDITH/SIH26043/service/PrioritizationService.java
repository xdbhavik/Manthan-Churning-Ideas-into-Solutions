package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.ScoreAggregation;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.PriorityBand;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.ScoreAggregationRepository;
import com.EDITH.SIH26043.web.dto.PrioritizationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Turns an aggregated score into a rank: the cycle's {@code priority_score} and
 * {@code priority_band}, then the hand-off to phase 3.
 *
 * <p>{@code priority_score} is deliberately the same number as {@code final_score}.
 * Nothing in the domain model supplies a second input — the AI problem profile is
 * contractually advisory and must not influence a score — so any "adjusted"
 * priority would be an invented constant that lets the coarse band and the precise
 * score disagree with each other. Keeping them equal means the band is always the
 * honest bucket of the score, and {@code priority_score} still does real work: it
 * is the tie-break inside a band for the existing
 * {@code idx_eval_cycle_priority (priority_band, priority_score DESC)} index.
 * Banding is the only opinionated part, and it lives in {@link #bandOf(BigDecimal)}
 * behind tunable thresholds.</p>
 *
 * <p>The score is read back from {@code evaluation_aggregation} rather than
 * recomputed, so there is exactly one place that decides what a problem scored.</p>
 */
@Service
public class PrioritizationService {

    private static final Logger log = LoggerFactory.getLogger(PrioritizationService.class);

    private final EvaluationCycleRepository cycleRepository;
    private final ScoreAggregationRepository aggregationRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;

    private final BigDecimal p1Threshold;
    private final BigDecimal p2Threshold;
    private final BigDecimal p3Threshold;

    public PrioritizationService(
            EvaluationCycleRepository cycleRepository,
            ScoreAggregationRepository aggregationRepository,
            EvaluationStatusService statusService,
            AuditService auditService,
            @Value("${app.evaluation.priority-p1-threshold:80}") BigDecimal p1Threshold,
            @Value("${app.evaluation.priority-p2-threshold:65}") BigDecimal p2Threshold,
            @Value("${app.evaluation.priority-p3-threshold:50}") BigDecimal p3Threshold) {
        this.cycleRepository = cycleRepository;
        this.aggregationRepository = aggregationRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.p1Threshold = p1Threshold;
        this.p2Threshold = p2Threshold;
        this.p3Threshold = p3Threshold;
    }

    /**
     * Bands the cycle and advances it to {@code PHASE_3_READY}.
     *
     * <p>Safe to re-invoke: on an already-{@code PRIORITIZED} cycle the band is
     * recomputed and saved (so a changed threshold can be applied) and only the
     * remaining hop is taken; on a {@code PHASE_3_READY} cycle it is a pure
     * recompute. A flagged disagreement does <em>not</em> stop this — the flag is
     * recorded for a human to read, not a gate.</p>
     *
     * @throws ApiException 404 for an unknown cycle, 409 when the cycle has not been
     *                      aggregated yet or is in no state where prioritising applies
     */
    @Transactional
    public PrioritizationResponse prioritize(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));

        EvaluationStatus before = cycle.getStatus();
        if (!EnumSet.of(EvaluationStatus.SCORES_AGGREGATED, EvaluationStatus.PRIORITIZED,
                EvaluationStatus.PHASE_3_READY).contains(before)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cycle " + cycleId + " is " + before + "; only an aggregated cycle can be "
                            + "prioritised (POST /evaluation/cycles/" + cycleId + "/aggregate first)");
        }

        ScoreAggregation aggregation = aggregationRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "Cycle " + cycleId + " has no aggregation row; aggregate it first"));
        BigDecimal score = aggregation.getOverallScore();
        if (score == null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Aggregation for cycle " + cycleId + " has no overall score; re-run "
                            + "POST /evaluation/cycles/" + cycleId + "/aggregate");
        }

        PriorityBand band = bandOf(score);
        cycle.setFinalScore(score);
        cycle.setPriorityScore(score);
        cycle.setPriorityBand(band);
        cycleRepository.save(cycle);

        if (before == EvaluationStatus.SCORES_AGGREGATED) {
            cycle = statusService.transition(cycleId, EvaluationStatus.PRIORITIZED, actorUserId,
                    "Priority " + band + " (score " + score + ")");
        }
        if (cycle.getStatus() != EvaluationStatus.PHASE_3_READY) {
            cycle = statusService.transition(cycleId, EvaluationStatus.PHASE_3_READY, actorUserId,
                    "Prioritised; ready for phase 3");
        }

        boolean reviewRequired = aggregation.isDisagreementFlag();
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("cycleId", cycleId);
        after.put("finalScore", score);
        after.put("impactLevel",
                cycle.getImpactLevel() == null ? null : cycle.getImpactLevel().name());
        after.put("priorityScore", score);
        after.put("priorityBand", band.name());
        after.put("reviewRequired", reviewRequired);
        after.put("status", cycle.getStatus().name());
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_PRIORITIZED,
                actorUserId, Map.of("status", before.name()), after, ipAddress);
        log.info("Cycle {} prioritised as {} (score {}, reviewRequired {})",
                cycleId, band, score, reviewRequired);

        return new PrioritizationResponse(
                cycleId, score, cycle.getImpactLevel(), score, band, cycle.getStatus(),
                reviewRequired,
                reviewRequired
                        ? "Prioritised as " + band + "; pool scores disagree, flagged for review"
                        : "Prioritised as " + band);
    }

    /**
     * The band a score falls in. Thresholds are inclusive lower bounds and read in
     * descending order, so a gap or overlap in configuration cannot produce a
     * surprise: an unconfigured score always lands somewhere.
     */
    private PriorityBand bandOf(BigDecimal score) {
        if (score.compareTo(p1Threshold) >= 0) {
            return PriorityBand.P1;
        }
        if (score.compareTo(p2Threshold) >= 0) {
            return PriorityBand.P2;
        }
        return score.compareTo(p3Threshold) >= 0 ? PriorityBand.P3 : PriorityBand.P4;
    }
}
