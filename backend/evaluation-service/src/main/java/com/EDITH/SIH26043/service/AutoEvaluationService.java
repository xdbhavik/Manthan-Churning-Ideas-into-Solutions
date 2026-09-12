package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.service.analysis.CriterionScoringClient;
import com.EDITH.SIH26043.service.analysis.CriterionScoringRequest;
import com.EDITH.SIH26043.service.analysis.CriterionScoringResult;
import com.EDITH.SIH26043.service.analysis.ProblemContext;
import com.EDITH.SIH26043.web.dto.ScoreSubmissionRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a problem into a complete, machine-produced scorecard for one pool.
 *
 * <p>This service only <em>prepares</em> the scorecard — it never writes one.
 * Persisting is done by {@code EvaluatorAssignmentService.submitAsSystem}, i.e.
 * through the exact write path a human submission uses, so every invariant
 * (all-criteria validation, SUBMITTED assignment, cycle knock-on) lives in one
 * place and cannot drift between the two kinds of evaluator.</p>
 *
 * <p>Everything that can go wrong is reported as {@link Optional#empty()} rather
 * than thrown: no key configured, the kill switch off, the model unreachable,
 * unusable JSON, a criterion the model skipped or scored above its own
 * {@code maxScore}. The caller then degrades that pool to MANUAL for this run
 * and records why — a down LLM must never block a problem's cycle.</p>
 */
@Service
public class AutoEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(AutoEvaluationService.class);

    private final CriterionScoringClient scoringClient;
    private final EvaluationCriterionRepository criterionRepository;
    private final ProblemAnalysisRepository analysisRepository;
    private final boolean autoScoringEnabled;

    public AutoEvaluationService(
            CriterionScoringClient scoringClient,
            EvaluationCriterionRepository criterionRepository,
            ProblemAnalysisRepository analysisRepository,
            @Value("${app.evaluation.auto-scoring-enabled:true}") boolean autoScoringEnabled) {
        this.scoringClient = scoringClient;
        this.criterionRepository = criterionRepository;
        this.analysisRepository = analysisRepository;
        this.autoScoringEnabled = autoScoringEnabled;
    }

    /**
     * A validated scorecard plus the provenance an audit row needs. Holding the
     * request here (rather than submitting) is what keeps a degradation clean:
     * when the model fails we have not yet created an assignment pointing at the
     * AI profile, so the pool simply falls through to a human.
     */
    public record PreparedScorecard(
            ScoreSubmissionRequest request,
            String provider,
            String model,
            int criteriaScored
    ) {
    }

    /** The hard kill switch ({@code app.evaluation.auto-scoring-enabled}). */
    public boolean enabled() {
        return autoScoringEnabled;
    }

    /**
     * Whether flipping a pool to AUTO would actually reach a model right now —
     * the kill switch is on and an API key is configured. A configured model can
     * still fail at call time; this is only the availability hint shown when the
     * switch is being flipped.
     */
    public boolean available() {
        return autoScoringEnabled && scoringClient.configured();
    }

    /**
     * Scores {@code pool}'s criteria for the given problem.
     *
     * @return a scorecard covering every active criterion of the pool, or empty
     *         when the AI cannot produce one (caller degrades the pool to MANUAL)
     */
    @Transactional(readOnly = true)
    public Optional<PreparedScorecard> prepare(UUID cycleId, ProblemContextResponse problem,
                                              EvaluatorType pool) {
        if (!autoScoringEnabled) {
            log.info("AUTO pool {} skipped: auto-scoring disabled by configuration", pool);
            return Optional.empty();
        }
        List<EvaluationCriterion> criteria =
                criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(pool);
        if (criteria.isEmpty()) {
            log.warn("AUTO pool {} has no active criteria; cannot score", pool);
            return Optional.empty();
        }

        CriterionScoringRequest request = new CriterionScoringRequest(
                pool,
                ProblemContext.from(problem),
                toSpecs(criteria),
                advisoryFor(cycleId));
        return scoringClient.score(request).flatMap(result -> toScorecard(result, criteria, pool));
    }

    // ------------------------------------------------------------------ helpers

    /**
     * The real all-criteria gate. The client already dropped keys we did not ask
     * for and invalidated any out-of-range score; what it cannot know is which
     * criteria were <em>expected</em>, so a model that silently omits one is
     * caught here — a half-filled scorecard would be rejected by the normal
     * validator anyway, and persisting it would be worse than not scoring at all.
     */
    private Optional<PreparedScorecard> toScorecard(CriterionScoringResult result,
                                                    List<EvaluationCriterion> criteria,
                                                    EvaluatorType pool) {
        List<ScoreSubmissionRequest.CriterionScore> scores = new ArrayList<>(criteria.size());
        for (EvaluationCriterion criterion : criteria) {
            Integer score = result.scoresByKey().get(criterion.getCriterionKey());
            if (score == null) {
                log.warn("AI scorecard for pool {} is incomplete: criterion '{}' was not scored",
                        pool, criterion.getCriterionKey());
                return Optional.empty();
            }
            int max = criterion.getMaxScore() == null ? 10 : criterion.getMaxScore();
            if (score > max) {
                log.warn("AI scored criterion '{}' of pool {} at {}, above its maxScore {}",
                        criterion.getCriterionKey(), pool, score, max);
                return Optional.empty();
            }
            scores.add(new ScoreSubmissionRequest.CriterionScore(
                    criterion.getCriterionId(),
                    criterion.getCriterionKey(),
                    score,
                    result.commentsByKey().get(criterion.getCriterionKey())));
        }
        return Optional.of(new PreparedScorecard(
                new ScoreSubmissionRequest(scores, result.feedback(), result.recommendation()),
                result.provider(), result.model(), scores.size()));
    }

    private static List<CriterionScoringRequest.CriterionSpec> toSpecs(
            List<EvaluationCriterion> criteria) {
        return criteria.stream()
                .map(c -> new CriterionScoringRequest.CriterionSpec(
                        c.getCriterionKey(),
                        c.getCriterionLabel(),
                        c.getDescription(),
                        c.getMaxScore() == null ? 10 : c.getMaxScore()))
                .toList();
    }

    /**
     * The advisory analysis profile, as extra context for the scorer — never as a
     * score (the analysis step is explicitly forbidden from producing one).
     * {@code null} when the analysis step has not run; the scorer copes.
     */
    private CriterionScoringRequest.AdvisoryProfile advisoryFor(UUID cycleId) {
        return analysisRepository.findByCycleId(cycleId)
                .map(a -> new CriterionScoringRequest.AdvisoryProfile(
                        a.getProblemCategory(), a.getDomain(), a.getSector(), a.getImpactAreas(),
                        a.getComplexity(), a.getPotentialScale(), a.getTechnologyRelevance(),
                        a.getSocialImpact()))
                .orElse(null);
    }
}
