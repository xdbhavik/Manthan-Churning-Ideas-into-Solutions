package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationResponse;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.entity.ScoreAggregation;
import com.EDITH.SIH26043.entity.WeightConfig;
import com.EDITH.SIH26043.enums.AggregationStatus;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.enums.ImpactLevel;
import com.EDITH.SIH26043.enums.ScoreSource;
import com.EDITH.SIH26043.enums.WeightingMethod;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationResponseRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ScoreAggregationRepository;
import com.EDITH.SIH26043.repository.WeightConfigRepository;
import com.EDITH.SIH26043.web.dto.AggregationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Folds a completed cycle's pool scorecards into the single result the rest of the
 * system ranks on: the {@code evaluation_aggregation} row plus the cycle's
 * {@code final_score} / {@code impact_level}.
 *
 * <p>This is the step the five-pool routing design was built for. Routing gives
 * every {@link EvaluatorType} a scorecard — AI-scored or human, the pool's own
 * switch decides — and this service turns those five numbers into one, weighted by
 * {@code weight_config}. Until it runs, a cycle carries scorecards but no result:
 * {@code final_score} and {@code priority_band} stay null and nothing can be
 * ranked.</p>
 *
 * <p><b>Where a pool's number comes from.</b> Each pool is normalised to 0–100
 * against the sum of its <em>own</em> criteria maxima, so a pool can never be
 * penalised for using a 5-point criterion where another uses a 10. A pool whose
 * stored scorecard does not cover every active criterion is <em>excluded</em>
 * rather than scored low: an unanswered criterion is not a score of zero.
 * {@code validateScorecard} already makes that impossible on the write path, so
 * this is a defensive check that keeps a hand-edited row from silently distorting
 * the result.</p>
 *
 * <p><b>Partial coverage renormalises.</b> When only some pools scored, the
 * configured weights are divided by their sum over the pools that <em>are</em>
 * present, not by the full 1.0. Treating a skipped pool as a zero would make the
 * final score a function of routing luck rather than of the problem. The
 * {@code EQUAL} fallback exists for a malformed weight configuration, never for
 * missing data — and {@code per_type_scores} lists every pool with its reason, so
 * reduced coverage is visible instead of silent.</p>
 *
 * <p>Idempotent by construction: re-running upserts the same row (the table is
 * 1:1 with the cycle) and skips the status transition it has already made, so the
 * manual endpoint is always safe to retry.</p>
 */
@Service
public class ScoreAggregationService {

    private static final Logger log = LoggerFactory.getLogger(ScoreAggregationService.class);

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal ONE = BigDecimal.ONE;
    /** How far the configured weights may miss a total of 1.0 before we stop trusting them. */
    private static final BigDecimal WEIGHT_SUM_TOLERANCE = new BigDecimal("0.001");
    private static final int SCORE_SCALE = 2;
    /** Internal precision for a weight after renormalisation — rounded only at the end. */
    private static final int WEIGHT_SCALE = 6;
    private static final int MAX_CRITERION_SCORE_WHEN_UNSET = 10;

    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluationResponseRepository responseRepository;
    private final EvaluationCriterionRepository criterionRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final ScoreAggregationRepository aggregationRepository;
    private final WeightConfigRepository weightConfigRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;

    private final BigDecimal impactHighThreshold;
    private final BigDecimal impactMediumThreshold;
    private final BigDecimal disagreementSpreadThreshold;

    public ScoreAggregationService(
            EvaluationCycleRepository cycleRepository,
            EvaluationAssignmentRepository assignmentRepository,
            EvaluationResponseRepository responseRepository,
            EvaluationCriterionRepository criterionRepository,
            EvaluatorProfileRepository profileRepository,
            ScoreAggregationRepository aggregationRepository,
            WeightConfigRepository weightConfigRepository,
            EvaluationStatusService statusService,
            AuditService auditService,
            @Value("${app.evaluation.impact-high-threshold:70}") BigDecimal impactHighThreshold,
            @Value("${app.evaluation.impact-medium-threshold:40}") BigDecimal impactMediumThreshold,
            @Value("${app.evaluation.disagreement-spread-threshold:30}")
            BigDecimal disagreementSpreadThreshold) {
        this.cycleRepository = cycleRepository;
        this.assignmentRepository = assignmentRepository;
        this.responseRepository = responseRepository;
        this.criterionRepository = criterionRepository;
        this.profileRepository = profileRepository;
        this.aggregationRepository = aggregationRepository;
        this.weightConfigRepository = weightConfigRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.impactHighThreshold = impactHighThreshold;
        this.impactMediumThreshold = impactMediumThreshold;
        this.disagreementSpreadThreshold = disagreementSpreadThreshold;
    }

    /**
     * Aggregates one cycle and advances it to {@code SCORES_AGGREGATED}.
     *
     * @param actorUserId who triggered this — the JWT user for the manual endpoint,
     *                    the cycle's own trigger for the automatic post-completion
     *                    pass (see {@code EvaluationCompletionService})
     * @throws ApiException 404 for an unknown cycle, 409 when the cycle is not at a
     *                      point where aggregating means anything, or when no pool
     *                      produced a scorecard at all
     */
    @Transactional
    public AggregationResponse aggregate(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));

        EvaluationStatus before = cycle.getStatus();
        if (!EnumSet.of(EvaluationStatus.EVALUATION_COMPLETED, EvaluationStatus.SCORES_AGGREGATED)
                .contains(before)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cycle " + cycleId + " is " + before + "; only an EVALUATION_COMPLETED cycle "
                            + "can be aggregated");
        }

        PoolScan scan = scanPools(cycleId);
        if (scan.present().isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cycle " + cycleId + " has no submitted scorecard; nothing to aggregate");
        }

        Optional<Map<EvaluatorType, BigDecimal>> configured = configuredWeights();
        WeightingMethod method = configured.isPresent()
                ? WeightingMethod.CONFIGURED : WeightingMethod.EQUAL;
        Map<EvaluatorType, BigDecimal> effective = effectiveWeights(configured.orElse(null),
                scan.present(), method);
        if (effective.isEmpty()) {
            // Every present pool carries a configured weight of zero — a degenerate
            // config. Equal weighting is the only reading that still produces a result.
            method = WeightingMethod.EQUAL;
            effective = effectiveWeights(null, scan.present(), WeightingMethod.EQUAL);
        }

        BigDecimal overall = overallScore(scan.present(), effective);
        ImpactLevel impactLevel = impactLevelOf(overall);
        Disagreement disagreement = disagreementOf(scan.present());

        Instant now = Instant.now();
        ScoreAggregation row = aggregationRepository.findByCycleId(cycleId)
                .orElseGet(ScoreAggregation::new);
        row.setCycleId(cycleId);
        row.setStatus(disagreement.flagged()
                ? AggregationStatus.REVIEW_REQUIRED : AggregationStatus.AGGREGATED);
        row.setOverallScore(overall);
        row.setPerTypeScores(perTypeScores(scan, configured.orElse(null), effective));
        row.setWeightingMethod(method);
        row.setNumAssignments(scan.present().size());
        row.setDisagreementFlag(disagreement.flagged());
        row.setDisagreementDetails(disagreement.details());
        row.setAggregatedAt(now);
        row.setUpdatedAt(now);
        // ScoreAggregation pre-sets version=1, so Spring Data takes the merge() path
        // on a new row: the returned instance is the managed copy, the argument is
        // not. Read back the id from the return value, never from `row`.
        ScoreAggregation saved = aggregationRepository.save(row);

        cycle.setFinalScore(overall);
        cycle.setImpactLevel(impactLevel);
        cycleRepository.save(cycle);

        if (before == EvaluationStatus.EVALUATION_COMPLETED) {
            cycle = statusService.transition(cycleId, EvaluationStatus.SCORES_AGGREGATED, actorUserId,
                    "Aggregated " + scan.present().size() + " pool scorecard(s)");
        }

        auditAggregated(cycle, scan, overall, method, disagreement, actorUserId, ipAddress, before);
        log.info("Aggregated cycle {}: overall {} ({}), {}/{} pools, disagreement={}",
                cycleId, overall, method, scan.present().size(), EvaluatorType.values().length,
                disagreement.flagged());

        return AggregationResponse.from(saved, cycle, reviewMessage(disagreement));
    }

    /**
     * The stored aggregation of a cycle, without recomputing it — the read half of the
     * pair, used to inspect {@code perTypeScores} and the disagreement evidence while a
     * flagged problem is being reviewed.
     *
     * @throws ApiException 404 for an unknown cycle or one that has not been aggregated
     */
    @Transactional(readOnly = true)
    public AggregationResponse get(UUID cycleId) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));
        ScoreAggregation row = aggregationRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Cycle " + cycleId + " has not been aggregated yet; "
                                + "POST /evaluation/cycles/" + cycleId + "/aggregate"));
        return AggregationResponse.from(row, cycle, "Stored aggregation");
    }

    // ------------------------------------------------------------------
    // per-pool normalisation
    // ------------------------------------------------------------------

    /**
     * One pool's normalised result. {@code rawScore}/{@code maxScore} are kept so
     * the stored snapshot explains how the 0–100 number was reached.
     */
    private record PoolScore(EvaluatorType pool, UUID assignmentId, BigDecimal normalised,
                             int rawScore, int maxScore, int criteriaScored,
                             ScoreSource source, Instant submittedAt) {
    }

    /** Every pool that produced a usable scorecard, plus why each of the others did not. */
    private record PoolScan(List<PoolScore> present, Map<EvaluatorType, String> absentReasons) {
    }

    private PoolScan scanPools(UUID cycleId) {
        Map<EvaluatorType, String> reasons = new EnumMap<>(EvaluatorType.class);
        for (EvaluatorType pool : EvaluatorType.values()) {
            reasons.put(pool, "no submitted scorecard for this pool");
        }

        List<EvaluationAssignment> submitted = new ArrayList<>(
                assignmentRepository.findByCycleIdAndStatusIn(cycleId,
                        List.of(AssignmentStatus.SUBMITTED)));
        // At most one assignment per pool in practice (routeAllPools creates one), but
        // a repair pass or a hand-inserted row could break that. Fold the earliest
        // submission deterministically rather than depending on query order.
        submitted.sort(Comparator
                .comparing((EvaluationAssignment a) -> a.getSubmittedAt(),
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(EvaluationAssignment::getAssignmentId));

        List<PoolScore> present = new ArrayList<>();
        EnumSet<EvaluatorType> seen = EnumSet.noneOf(EvaluatorType.class);
        for (EvaluationAssignment assignment : submitted) {
            EvaluatorProfile profile = profileRepository.findById(assignment.getEvaluatorProfileId())
                    .orElse(null);
            if (profile == null) {
                continue; // Nothing to attribute the scores to; the pool stays absent.
            }
            EvaluatorType pool = profile.getEvaluatorType();
            if (!seen.add(pool)) {
                continue;
            }

            List<EvaluationCriterion> criteria = criterionRepository
                    .findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(pool);
            if (criteria.isEmpty()) {
                reasons.put(pool, "pool has no active criteria");
                continue;
            }

            Map<UUID, EvaluationResponse> responses = new HashMap<>();
            for (EvaluationResponse response : responseRepository
                    .findById_AssignmentId(assignment.getAssignmentId())) {
                responses.put(response.getId().getCriterionId(), response);
            }

            int raw = 0;
            int max = 0;
            int scored = 0;
            ScoreSource source = ScoreSource.HUMAN;
            for (EvaluationCriterion criterion : criteria) {
                EvaluationResponse response = responses.get(criterion.getCriterionId());
                if (response == null || response.getScore() == null) {
                    continue; // counted as missing below
                }
                raw += response.getScore();
                max += maxScoreOf(criterion);
                scored++;
                if (response.getScoreSource() != null) {
                    source = response.getScoreSource();
                }
            }
            if (scored < criteria.size()) {
                reasons.put(pool, "scorecard is incomplete (" + scored + " of " + criteria.size()
                        + " criteria stored)");
                continue;
            }

            BigDecimal normalised = BigDecimal.valueOf(raw)
                    .multiply(HUNDRED)
                    .divide(BigDecimal.valueOf(max), SCORE_SCALE, RoundingMode.HALF_UP);
            present.add(new PoolScore(pool, assignment.getAssignmentId(), normalised, raw, max,
                    scored, source, assignment.getSubmittedAt()));
            reasons.remove(pool);
        }
        return new PoolScan(present, reasons);
    }

    // ------------------------------------------------------------------
    // weighting
    // ------------------------------------------------------------------

    /**
     * The configured weights, or empty when the configuration cannot be trusted:
     * a pool with no row, a weight outside [0,1], or a total that is not 1.0.
     */
    private Optional<Map<EvaluatorType, BigDecimal>> configuredWeights() {
        Map<EvaluatorType, BigDecimal> weights = new EnumMap<>(EvaluatorType.class);
        for (WeightConfig config : weightConfigRepository.findAll()) {
            if (config.getEvaluatorType() != null && config.getWeight() != null) {
                weights.put(config.getEvaluatorType(), config.getWeight());
            }
        }
        if (weights.size() != EvaluatorType.values().length) {
            return Optional.empty();
        }
        BigDecimal total = ZERO;
        for (BigDecimal weight : weights.values()) {
            if (weight.compareTo(ZERO) < 0 || weight.compareTo(ONE) > 0) {
                return Optional.empty();
            }
            total = total.add(weight);
        }
        return total.subtract(ONE).abs().compareTo(WEIGHT_SUM_TOLERANCE) <= 0
                ? Optional.of(weights) : Optional.empty();
    }

    /**
     * The weight each present pool actually contributes with. Under
     * {@code CONFIGURED} the configured weights are renormalised over the pools that
     * scored, so a cycle with three of five pools still sums to 1.0.
     */
    private Map<EvaluatorType, BigDecimal> effectiveWeights(
            Map<EvaluatorType, BigDecimal> configured, List<PoolScore> present,
            WeightingMethod method) {
        Map<EvaluatorType, BigDecimal> effective = new EnumMap<>(EvaluatorType.class);
        if (method == WeightingMethod.EQUAL || configured == null) {
            BigDecimal equal = ONE.divide(BigDecimal.valueOf(present.size()), WEIGHT_SCALE,
                    RoundingMode.HALF_UP);
            for (PoolScore score : present) {
                effective.put(score.pool(), equal);
            }
            return effective;
        }

        BigDecimal sum = ZERO;
        for (PoolScore score : present) {
            sum = sum.add(configured.get(score.pool()));
        }
        if (sum.signum() == 0) {
            return effective; // Caller falls back to EQUAL rather than dividing by zero.
        }
        for (PoolScore score : present) {
            effective.put(score.pool(), configured.get(score.pool())
                    .divide(sum, WEIGHT_SCALE, RoundingMode.HALF_UP));
        }
        return effective;
    }

    private BigDecimal overallScore(List<PoolScore> present,
                                    Map<EvaluatorType, BigDecimal> effective) {
        BigDecimal total = ZERO;
        for (PoolScore score : present) {
            BigDecimal weight = effective.get(score.pool());
            if (weight != null) {
                total = total.add(weight.multiply(score.normalised()));
            }
        }
        BigDecimal clamped = total.max(ZERO).min(HUNDRED);
        return clamped.setScale(SCORE_SCALE, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    // outputs
    // ------------------------------------------------------------------

    private ImpactLevel impactLevelOf(BigDecimal overall) {
        if (overall.compareTo(impactHighThreshold) >= 0) {
            return ImpactLevel.HIGH;
        }
        return overall.compareTo(impactMediumThreshold) >= 0 ? ImpactLevel.MEDIUM : ImpactLevel.LOW;
    }

    /** Whether the pools disagreed enough to be worth a human look, plus the evidence. */
    private record Disagreement(boolean flagged, Map<String, Object> details) {
    }

    private Disagreement disagreementOf(List<PoolScore> present) {
        if (present.size() < 2) {
            return new Disagreement(false, null);
        }
        PoolScore max = present.get(0);
        PoolScore min = present.get(0);
        for (PoolScore score : present) {
            if (score.normalised().compareTo(max.normalised()) > 0) {
                max = score;
            }
            if (score.normalised().compareTo(min.normalised()) < 0) {
                min = score;
            }
        }
        BigDecimal spread = max.normalised().subtract(min.normalised())
                .setScale(SCORE_SCALE, RoundingMode.HALF_UP);
        if (spread.compareTo(disagreementSpreadThreshold) <= 0) {
            return new Disagreement(false, null);
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("spread", spread);
        details.put("threshold", disagreementSpreadThreshold);
        details.put("poolsScored", present.size());
        details.put("poolsTotal", EvaluatorType.values().length);
        details.put("maxPool", max.pool().name());
        details.put("maxScore", max.normalised());
        details.put("minPool", min.pool().name());
        details.put("minScore", min.normalised());
        return new Disagreement(true, details);
    }

    /**
     * The stored snapshot: every pool in enum order, including the absent ones with
     * their reason, so a reader can tell "scored poorly" from "never scored".
     * LinkedHashMap throughout — absent entries carry nulls, which {@code Map.of}
     * cannot hold.
     */
    private Map<String, Object> perTypeScores(PoolScan scan,
                                              Map<EvaluatorType, BigDecimal> configured,
                                              Map<EvaluatorType, BigDecimal> effective) {
        Map<EvaluatorType, PoolScore> byPool = new EnumMap<>(EvaluatorType.class);
        scan.present().forEach(score -> byPool.put(score.pool(), score));

        Map<String, Object> result = new LinkedHashMap<>();
        for (EvaluatorType pool : EvaluatorType.values()) {
            PoolScore score = byPool.get(pool);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("present", score != null);
            if (score == null) {
                entry.put("reason", scan.absentReasons().get(pool));
                entry.put("configuredWeight", configured == null ? null : configured.get(pool));
                entry.put("effectiveWeight", ZERO);
            } else {
                entry.put("normalisedScore", score.normalised());
                entry.put("rawScore", score.rawScore());
                entry.put("maxScore", score.maxScore());
                entry.put("criteriaScored", score.criteriaScored());
                entry.put("scoreSource", score.source() == null ? null : score.source().name());
                entry.put("assignmentId", String.valueOf(score.assignmentId()));
                // ISO-8601 text, not an Instant: this lands in JSONB and has to survive
                // a change of mapper.
                entry.put("submittedAt",
                        score.submittedAt() == null ? null : score.submittedAt().toString());
                entry.put("configuredWeight", configured == null ? null : configured.get(pool));
                entry.put("effectiveWeight", effective.get(pool));
            }
            result.put(pool.name(), entry);
        }
        return result;
    }

    private void auditAggregated(EvaluationCycle cycle, PoolScan scan, BigDecimal overall,
                                 WeightingMethod method, Disagreement disagreement,
                                 UUID actorUserId, String ipAddress, EvaluationStatus before) {
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("cycleId", cycle.getCycleId());
        after.put("overallScore", overall);
        after.put("impactLevel", cycle.getImpactLevel() == null ? null : cycle.getImpactLevel().name());
        after.put("weightingMethod", method.name());
        after.put("numAssignments", scan.present().size());
        after.put("poolsTotal", EvaluatorType.values().length);
        after.put("disagreementFlag", disagreement.flagged());
        auditService.record("PROBLEM", cycle.getProblemId(), AuditAction.EVALUATION_AGGREGATED,
                actorUserId, Map.of("status", before.name()), after, ipAddress);

        if (disagreement.flagged()) {
            auditService.record("PROBLEM", cycle.getProblemId(),
                    AuditAction.EVALUATION_DISAGREEMENT_FLAGGED, actorUserId, null,
                    disagreement.details(), ipAddress);
        }
    }

    private static String reviewMessage(Disagreement disagreement) {
        return disagreement.flagged()
                ? "Aggregated; pool scores disagree beyond the threshold, flagged for review"
                : "Aggregated";
    }

    private static int maxScoreOf(EvaluationCriterion criterion) {
        return criterion.getMaxScore() == null
                ? MAX_CRITERION_SCORE_WHEN_UNSET : criterion.getMaxScore();
    }
}
