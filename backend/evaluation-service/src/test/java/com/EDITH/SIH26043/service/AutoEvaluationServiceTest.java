package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.service.analysis.CriterionScoringClient;
import com.EDITH.SIH26043.service.analysis.CriterionScoringRequest;
import com.EDITH.SIH26043.service.analysis.CriterionScoringResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The AI scorer's contract with the rest of the pipeline. Two things matter: it
 * produces a scorecard covering <em>every</em> active criterion of the pool (a
 * half-filled form must never reach the write path), and every failure mode —
 * no key, kill switch off, model down, unusable answer — is reported as empty so
 * the caller can degrade that one pool to a human instead of blocking the cycle.
 */
class AutoEvaluationServiceTest {

    private final CriterionScoringClient scoringClient = mock(CriterionScoringClient.class);
    private final EvaluationCriterionRepository criterionRepository =
            mock(EvaluationCriterionRepository.class);
    private final ProblemAnalysisRepository analysisRepository = mock(ProblemAnalysisRepository.class);

    private final AutoEvaluationService service =
            new AutoEvaluationService(scoringClient, criterionRepository, analysisRepository, true);

    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    private final EvaluationCriterion impact = criterion("impact", "Impact", 10);
    private final EvaluationCriterion feasibility = criterion("feasibility", "Feasibility", 5);

    @Test
    void aCompleteModelAnswerBecomesThePoolsScorecard() {
        givenCriteria(impact, feasibility);
        givenModelScores(Map.of("impact", 8, "feasibility", 4));

        Optional<AutoEvaluationService.PreparedScorecard> prepared =
                service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT);

        assertThat(prepared).isPresent();
        AutoEvaluationService.PreparedScorecard card = prepared.get();
        assertThat(card.criteriaScored()).isEqualTo(2);
        assertThat(card.provider()).isEqualTo("openai-compatible");
        assertThat(card.model()).isEqualTo("test-model");
        assertThat(card.request().scores())
                .extracting(s -> s.criterionId() + "=" + s.score())
                .containsExactly(impact.getCriterionId() + "=8", feasibility.getCriterionId() + "=4");
        assertThat(card.request().feedback()).isEqualTo("Strong problem");
        assertThat(card.request().recommendation()).isEqualTo("SHORTLIST");
    }

    @Test
    void theModelIsGivenThePoolsCriteriaAndTheProblemsContext() {
        givenCriteria(impact, feasibility);
        givenModelScores(Map.of("impact", 8, "feasibility", 4));

        service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT);

        ArgumentCaptor<CriterionScoringRequest> sent =
                ArgumentCaptor.forClass(CriterionScoringRequest.class);
        verify(scoringClient).score(sent.capture());
        assertThat(sent.getValue().pool()).isEqualTo(EvaluatorType.GOVERNMENT);
        assertThat(sent.getValue().problem().title()).isEqualTo("Irregular drinking water supply");
        assertThat(sent.getValue().criteria()).extracting(CriterionScoringRequest.CriterionSpec::criterionKey)
                .containsExactly("impact", "feasibility");
        // No analysis row for this cycle: the advisory context is simply absent, and
        // the scorer must still run.
        assertThat(sent.getValue().advisory()).isNull();
    }

    @Test
    void aCriterionTheModelSkippedDiscardsTheWholeScorecard() {
        givenCriteria(impact, feasibility);
        givenModelScores(Map.of("impact", 8)); // feasibility missing

        assertThat(service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT)).isEmpty();
    }

    @Test
    void aScoreAboveTheCriterionsOwnMaxDiscardsTheScorecard() {
        givenCriteria(impact, feasibility);
        givenModelScores(Map.of("impact", 8, "feasibility", 7)); // feasibility caps at 5

        assertThat(service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT)).isEmpty();
    }

    @Test
    void anUnreachableModelYieldsNoScorecardRatherThanAnException() {
        givenCriteria(impact, feasibility);
        when(scoringClient.score(any())).thenReturn(Optional.empty());

        assertThat(service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT)).isEmpty();
    }

    @Test
    void aPoolWithoutActiveCriteriaIsNotScored() {
        givenCriteria();

        assertThat(service.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT)).isEmpty();
        verify(scoringClient, never()).score(any());
    }

    @Test
    void theKillSwitchTakesTheMachineOutOfTheLoopEntirely() {
        AutoEvaluationService disabled =
                new AutoEvaluationService(scoringClient, criterionRepository, analysisRepository, false);
        givenCriteria(impact, feasibility);

        assertThat(disabled.enabled()).isFalse();
        assertThat(disabled.available()).isFalse();
        assertThat(disabled.prepare(cycleId, problem(), EvaluatorType.GOVERNMENT)).isEmpty();
        verify(scoringClient, never()).score(any());
    }

    // ------------------------------------------------------------------ fixtures

    private void givenCriteria(EvaluationCriterion... criteria) {
        when(criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(
                EvaluatorType.GOVERNMENT)).thenReturn(List.of(criteria));
    }

    private void givenModelScores(Map<String, Integer> scores) {
        when(scoringClient.score(any())).thenReturn(Optional.of(new CriterionScoringResult(
                scores, Map.of(), "Strong problem", "SHORTLIST", "openai-compatible", "test-model")));
    }

    private EvaluationCriterion criterion(String key, String label, int maxScore) {
        EvaluationCriterion criterion = new EvaluationCriterion();
        criterion.setCriterionId(UUID.randomUUID());
        criterion.setEvaluatorType(EvaluatorType.GOVERNMENT);
        criterion.setCriterionKey(key);
        criterion.setCriterionLabel(label);
        criterion.setMaxScore(maxScore);
        criterion.setActive(true);
        return criterion;
    }

    private ProblemContextResponse problem() {
        return new ProblemContextResponse(
                problemId, "REGISTERED", "Irregular drinking water supply",
                "Hand pumps dry during summer.", "GOVT", null, null, null, null,
                null, null, null, List.of(), 0, null, List.of());
    }
}
