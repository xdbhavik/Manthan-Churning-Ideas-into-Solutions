package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationResponse;
import com.EDITH.SIH26043.entity.EvaluationResponseId;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Folding the five pool scorecards into one weighted 0–100 result.
 *
 * <p>The rules that carry the weight here are the ones a wrong choice would hide:
 * a pool must be normalised against its <em>own</em> criteria maxima, a pool that
 * did not score must be renormalised around rather than counted as a zero, and a
 * malformed weight config must fall back to equal weights instead of producing
 * nonsense. The disagreement flag is checked at its boundary in both directions,
 * because "flagged" is a claim about real evaluator divergence.</p>
 */
class ScoreAggregationServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository =
            mock(EvaluationAssignmentRepository.class);
    private final EvaluationResponseRepository responseRepository =
            mock(EvaluationResponseRepository.class);
    private final EvaluationCriterionRepository criterionRepository =
            mock(EvaluationCriterionRepository.class);
    private final EvaluatorProfileRepository profileRepository =
            mock(EvaluatorProfileRepository.class);
    private final ScoreAggregationRepository aggregationRepository =
            mock(ScoreAggregationRepository.class);
    private final WeightConfigRepository weightConfigRepository =
            mock(WeightConfigRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);

    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();
    private final UUID actor = UUID.randomUUID();

    private final List<EvaluationAssignment> submitted = new ArrayList<>();
    private final List<WeightConfig> weights = new ArrayList<>();
    private EvaluationCycle cycle;

    private ScoreAggregationService service;

    @BeforeEach
    void setUp() {
        service = serviceWith(new BigDecimal("70"), new BigDecimal("40"), new BigDecimal("30"));

        cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(EvaluationStatus.EVALUATION_COMPLETED);
        cycle.setTriggeredByUserId(actor);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(cycleRepository.save(any(EvaluationCycle.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(assignmentRepository.findByCycleIdAndStatusIn(eq(cycleId), anyList()))
                .thenReturn(submitted);

        weights.addAll(seededWeights());
        when(weightConfigRepository.findAll()).thenReturn(weights);

        when(aggregationRepository.save(any(ScoreAggregation.class))).thenAnswer(invocation -> {
            // Mirrors the real merge(): the argument keeps its null id, the returned
            // instance is the managed copy the service must read the id from.
            ScoreAggregation row = invocation.getArgument(0);
            if (row.getAggregationId() == null) {
                row.setAggregationId(UUID.randomUUID());
            }
            return row;
        });
        when(statusService.transition(eq(cycleId), any(EvaluationStatus.class), any(), anyString()))
                .thenAnswer(invocation -> {
                    cycle.setStatus(invocation.getArgument(1));
                    return cycle;
                });
    }

    private ScoreAggregationService serviceWith(BigDecimal high, BigDecimal medium, BigDecimal spread) {
        return new ScoreAggregationService(cycleRepository, assignmentRepository, responseRepository,
                criterionRepository, profileRepository, aggregationRepository, weightConfigRepository,
                statusService, auditService, high, medium, spread);
    }

    // ------------------------------------------------------------------
    // the weighted average
    // ------------------------------------------------------------------

    @Test
    void theConfiguredWeightsProduceTheWeightedAverage() {
        // Normalised per pool: 100, 50, 50, 100, 50 against the seeded weights.
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);
        stubScorecard(EvaluatorType.HEI, 5, ScoreSource.AI);
        stubScorecard(EvaluatorType.CITIZEN, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.COMMUNITY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        // .25*100 + .15*50 + .15*50 + .25*100 + .20*50 = 75.00
        assertThat(response.overallScore()).isEqualByComparingTo("75.00");
        assertThat(response.weightingMethod()).isEqualTo(WeightingMethod.CONFIGURED);
        assertThat(response.numAssignments()).isEqualTo(5);
        // The pools landed 100 vs 50 apart, so this run is flagged as well.
        assertThat(response.disagreementFlag()).isTrue();
        assertThat(response.cycleStatus()).isEqualTo(EvaluationStatus.SCORES_AGGREGATED);
        assertThat(cycle.getFinalScore()).isEqualByComparingTo("75.00");
        assertThat(cycle.getImpactLevel()).isEqualTo(ImpactLevel.HIGH);
    }

    @Test
    void aPoolIsNormalisedAgainstItsOwnCriteriaMaxima() {
        // Five criteria that do not share a maxima scale: 5,5,5,5,10 = 30.
        stubScorecard(EvaluatorType.GOVERNMENT, List.of(5, 5, 5, 5, 10),
                List.of(5, 5, 5, 5, 10), ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.overallScore()).isEqualByComparingTo("100.00");
        assertThat(poolEntry(response, EvaluatorType.GOVERNMENT))
                .containsEntry("rawScore", 30)
                .containsEntry("maxScore", 30);
    }

    @Test
    void missingPoolsAreRenormalisedAroundRatherThanCountedAsZero() {
        // Only two of five pools scored: weights .25 and .15 renormalise over .40.
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        // .625*100 + .375*50 = 81.25 — not the 32.50 a zero-fill would give.
        assertThat(response.overallScore()).isEqualByComparingTo("81.25");
        assertThat(response.weightingMethod()).isEqualTo(WeightingMethod.CONFIGURED);
        assertThat(response.numAssignments()).isEqualTo(2);
        assertThat(poolEntry(response, EvaluatorType.GOVERNMENT))
                .containsEntry("effectiveWeight", new BigDecimal("0.625000"));
        assertThat(poolEntry(response, EvaluatorType.HEI))
                .containsEntry("present", false)
                .containsEntry("effectiveWeight", BigDecimal.ZERO);
        assertThat((String) poolEntry(response, EvaluatorType.HEI).get("reason"))
                .contains("no submitted scorecard");
    }

    @Test
    void everyPoolAppearsInTheSnapshotEvenWhenItDidNotScore() {
        stubScorecard(EvaluatorType.HEI, 8, ScoreSource.HUMAN);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.perTypeScores()).hasSize(EvaluatorType.values().length);
        assertThat(response.perTypeScores().keySet())
                .containsExactlyElementsOf(List.of("GOVERNMENT", "INDUSTRY", "HEI", "CITIZEN",
                        "COMMUNITY"));
    }

    @Test
    void aiAndHumanScorecardsWeighTheSameButProvenanceIsRecorded() {
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 8, ScoreSource.HUMAN);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.overallScore()).isEqualByComparingTo("80.00");
        assertThat(poolEntry(response, EvaluatorType.GOVERNMENT))
                .containsEntry("scoreSource", "AI");
        assertThat(poolEntry(response, EvaluatorType.INDUSTRY))
                .containsEntry("scoreSource", "HUMAN");
    }

    // ------------------------------------------------------------------
    // weight configuration fallbacks
    // ------------------------------------------------------------------

    @Test
    void noWeightRowsFallBackToEqualWeights() {
        weights.clear();
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.weightingMethod()).isEqualTo(WeightingMethod.EQUAL);
        assertThat(response.overallScore()).isEqualByComparingTo("75.00"); // plain mean
        assertThat(poolEntry(response, EvaluatorType.INDUSTRY))
                .containsEntry("configuredWeight", null);
    }

    @Test
    void weightsThatDoNotSumToOneFallBackToEqualWeights() {
        weights.clear();
        weights.add(weight(EvaluatorType.GOVERNMENT, "0.25"));
        weights.add(weight(EvaluatorType.INDUSTRY, "0.15"));
        weights.add(weight(EvaluatorType.HEI, "0.15"));
        weights.add(weight(EvaluatorType.CITIZEN, "0.25"));
        weights.add(weight(EvaluatorType.COMMUNITY, "0.10")); // total 0.90
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.weightingMethod()).isEqualTo(WeightingMethod.EQUAL);
        assertThat(response.overallScore()).isEqualByComparingTo("75.00");
    }

    @Test
    void aWeightOutsideZeroToOneIsNotTrusted() {
        weights.clear();
        weights.add(weight(EvaluatorType.GOVERNMENT, "1.50"));
        weights.add(weight(EvaluatorType.INDUSTRY, "0.15"));
        weights.add(weight(EvaluatorType.HEI, "0.15"));
        weights.add(weight(EvaluatorType.CITIZEN, "0.25"));
        weights.add(weight(EvaluatorType.COMMUNITY, "0.20"));

        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        assertThat(service.aggregate(cycleId, actor, "127.0.0.1").weightingMethod())
                .isEqualTo(WeightingMethod.EQUAL);
    }

    @Test
    void aWeightConfigOfAllZerosFallsBackToEqualInsteadOfDividingByZero() {
        weights.clear();
        for (EvaluatorType pool : EvaluatorType.values()) {
            weights.add(weight(pool, "0.000"));
        }
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.weightingMethod()).isEqualTo(WeightingMethod.EQUAL);
        assertThat(response.overallScore()).isEqualByComparingTo("75.00");
    }

    // ------------------------------------------------------------------
    // disagreement
    // ------------------------------------------------------------------

    @Test
    void aSpreadBeyondTheThresholdIsFlaggedForReview() {
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 5, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.disagreementFlag()).isTrue();
        assertThat(response.status()).isEqualTo(AggregationStatus.REVIEW_REQUIRED);
        assertThat(response.reviewRequired()).isTrue();
        assertThat(response.disagreementDetails())
                .containsEntry("spread", new BigDecimal("50.00"))
                .containsEntry("threshold", new BigDecimal("30"))
                .containsEntry("maxPool", "GOVERNMENT")
                .containsEntry("minPool", "INDUSTRY")
                .containsEntry("poolsScored", 2);
        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.EVALUATION_DISAGREEMENT_FLAGGED), eq(actor), isNull(), any(),
                eq("127.0.0.1"));
    }

    @Test
    void aSpreadExactlyAtTheThresholdIsNotFlagged() {
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI); // 100
        stubScorecard(EvaluatorType.INDUSTRY, 7, ScoreSource.AI);    // 70 → spread exactly 30

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.disagreementFlag()).isFalse();
        assertThat(response.status()).isEqualTo(AggregationStatus.AGGREGATED);
        assertThat(response.disagreementDetails()).isNull();
        verify(auditService, never()).record(anyString(), any(),
                eq(AuditAction.EVALUATION_DISAGREEMENT_FLAGGED), any(), any(), any(), anyString());
    }

    @Test
    void aSinglePoolIsNeverFlagged() {
        stubScorecard(EvaluatorType.GOVERNMENT, 1, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.disagreementFlag()).isFalse();
        assertThat(response.disagreementDetails()).isNull();
    }

    // ------------------------------------------------------------------
    // exclusion of unusable scorecards
    // ------------------------------------------------------------------

    @Test
    void aPoolWhoseStoredScorecardIsIncompleteIsExcludedWithAReason() {
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        // INDUSTRY has five active criteria but stored only three of them.
        stubScorecard(EvaluatorType.INDUSTRY, List.of(10, 10, 10), List.of(10, 10, 10, 10, 10),
                ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.numAssignments()).isEqualTo(1);
        assertThat(response.overallScore()).isEqualByComparingTo("100.00");
        assertThat((String) poolEntry(response, EvaluatorType.INDUSTRY).get("reason"))
                .contains("incomplete").contains("3 of 5");
    }

    @Test
    void aPoolWithNoActiveCriteriaIsExcluded() {
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        UUID profileId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        when(profileRepository.findById(profileId)).thenReturn(Optional.of(profile(profileId, EvaluatorType.INDUSTRY)));
        when(criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(EvaluatorType.INDUSTRY))
                .thenReturn(List.of());
        submitted.add(assignment(assignmentId, profileId));

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.numAssignments()).isEqualTo(1);
        assertThat((String) poolEntry(response, EvaluatorType.INDUSTRY).get("reason"))
                .contains("no active criteria");
    }

    // ------------------------------------------------------------------
    // guards, transitions and idempotency
    // ------------------------------------------------------------------

    @Test
    void aCycleWithNoSubmittedScorecardIsAConflictAndWritesNothing() {
        assertThatThrownBy(() -> service.aggregate(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("no submitted scorecard")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(aggregationRepository, never()).save(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void aCycleThatIsNotCompletedCannotBeAggregated() {
        cycle.setStatus(EvaluationStatus.EVALUATION_IN_PROGRESS);
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);

        assertThatThrownBy(() -> service.aggregate(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("EVALUATION_IN_PROGRESS")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(aggregationRepository, never()).save(any());
    }

    @Test
    void anUnknownCycleIsNotFound() {
        UUID unknown = UUID.randomUUID();

        assertThatThrownBy(() -> service.aggregate(unknown, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void aggregatingTransitionsAndAuditsWithTheCallerAsTheActor() {
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);

        service.aggregate(cycleId, actor, "10.0.0.9");

        verify(statusService).transition(cycleId, EvaluationStatus.SCORES_AGGREGATED, actor,
                "Aggregated 1 pool scorecard(s)");
        ArgumentCaptor<Map<String, Object>> after = afterCaptor();
        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.EVALUATION_AGGREGATED), eq(actor), eq(Map.of("status",
                        "EVALUATION_COMPLETED")), after.capture(), eq("10.0.0.9"));
        assertThat(after.getValue())
                .containsEntry("overallScore", new BigDecimal("80.00"))
                .containsEntry("weightingMethod", "CONFIGURED")
                .containsEntry("numAssignments", 1)
                .containsEntry("disagreementFlag", false);
    }

    @Test
    void aRerunOnAnAggregatedCycleUpdatesTheSameRowAndSkipsTheTransition() {
        cycle.setStatus(EvaluationStatus.SCORES_AGGREGATED);
        UUID existingId = UUID.randomUUID();
        ScoreAggregation existing = new ScoreAggregation();
        existing.setAggregationId(existingId);
        existing.setCycleId(cycleId);
        existing.setVersion(3);
        when(aggregationRepository.findByCycleId(cycleId)).thenReturn(Optional.of(existing));
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.aggregationId()).isEqualTo(existingId);
        assertThat(response.overallScore()).isEqualByComparingTo("80.00");
        verify(aggregationRepository).save(existing);
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void theResponseCarriesTheManagedRowIdNotTheDetachedArguments() {
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);

        AggregationResponse response = service.aggregate(cycleId, actor, "127.0.0.1");

        assertThat(response.aggregationId()).isNotNull();
        assertThat(response.aggregatedAt()).isNotNull();
    }

    // ------------------------------------------------------------------
    // impact thresholds
    // ------------------------------------------------------------------

    @Test
    void impactThresholdsBucketTheScore() {
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);   // 80 → HIGH at ≥70
        service.aggregate(cycleId, actor, "1.1.1.1");

        assertThat(cycle.getImpactLevel()).isEqualTo(ImpactLevel.HIGH);
    }

    @Test
    void aMediumScoreIsMedium() {
        stubScorecard(EvaluatorType.GOVERNMENT, 5, ScoreSource.AI);   // 50 ≥ 40
        service.aggregate(cycleId, actor, "1.1.1.1");

        assertThat(cycle.getImpactLevel()).isEqualTo(ImpactLevel.MEDIUM);
    }

    @Test
    void aLowScoreIsLow() {
        stubScorecard(EvaluatorType.GOVERNMENT, 2, ScoreSource.AI);   // 20 < 40
        service.aggregate(cycleId, actor, "1.1.1.1");

        assertThat(cycle.getImpactLevel()).isEqualTo(ImpactLevel.LOW);
    }

    @Test
    void theImpactThresholdsAreTunable() {
        ScoreAggregationService strict = serviceWith(new BigDecimal("90"), new BigDecimal("95"),
                new BigDecimal("30"));
        stubScorecard(EvaluatorType.GOVERNMENT, 8, ScoreSource.AI);   // 80

        strict.aggregate(cycleId, actor, "1.1.1.1");

        // 80 clears neither 90 nor 95, so it is LOW despite the shipped HIGH at 70.
        assertThat(cycle.getImpactLevel()).isEqualTo(ImpactLevel.LOW);
    }

    @Test
    void theDisagreementThresholdIsTunable() {
        ScoreAggregationService suspicious = serviceWith(new BigDecimal("70"), new BigDecimal("40"),
                new BigDecimal("5"));
        stubScorecard(EvaluatorType.GOVERNMENT, 10, ScoreSource.AI);
        stubScorecard(EvaluatorType.INDUSTRY, 9, ScoreSource.AI);     // spread 10 > 5

        assertThat(suspicious.aggregate(cycleId, actor, "1.1.1.1").disagreementFlag()).isTrue();
    }

    // ------------------------------------------------------------------
    // the read half
    // ------------------------------------------------------------------

    @Test
    void theStoredAggregationCanBeReadBack() {
        ScoreAggregation stored = new ScoreAggregation();
        stored.setAggregationId(UUID.randomUUID());
        stored.setCycleId(cycleId);
        stored.setOverallScore(new BigDecimal("75.00"));
        stored.setWeightingMethod(WeightingMethod.CONFIGURED);
        stored.setStatus(AggregationStatus.AGGREGATED);
        stored.setPerTypeScores(Map.of("GOVERNMENT", Map.of("present", true)));
        when(aggregationRepository.findByCycleId(cycleId)).thenReturn(Optional.of(stored));

        AggregationResponse response = service.get(cycleId);

        assertThat(response.cycleId()).isEqualTo(cycleId);
        assertThat(response.overallScore()).isEqualByComparingTo("75.00");
        assertThat(response.cycleStatus()).isEqualTo(EvaluationStatus.EVALUATION_COMPLETED);
    }

    @Test
    void readingACycleThatWasNeverAggregatedIsNotFound() {
        when(aggregationRepository.findByCycleId(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(cycleId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not been aggregated")
                .extracting(e -> ((ApiException) e).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ------------------------------------------------------------------
    // fixtures
    // ------------------------------------------------------------------

    /** Stubs a complete scorecard: five criteria of max 10, the same score on each. */
    private void stubScorecard(EvaluatorType pool, int perCriterionScore, ScoreSource source) {
        stubScorecard(pool, List.of(perCriterionScore, perCriterionScore, perCriterionScore,
                perCriterionScore, perCriterionScore), List.of(10, 10, 10, 10, 10), source);
    }

    /** Stubs a scorecard with explicit scores and matching criteria maxima. */
    private void stubScorecard(EvaluatorType pool, List<Integer> scores, List<Integer> maxima,
                               ScoreSource source) {
        UUID profileId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        when(profileRepository.findById(profileId))
                .thenReturn(Optional.of(profile(profileId, pool)));

        List<EvaluationCriterion> criteria = new ArrayList<>();
        for (int i = 0; i < maxima.size(); i++) {
            EvaluationCriterion criterion = new EvaluationCriterion();
            criterion.setCriterionId(UUID.randomUUID());
            criterion.setEvaluatorType(pool);
            criterion.setCriterionKey(pool.name().toLowerCase() + "_" + i);
            criterion.setMaxScore(maxima.get(i));
            criterion.setSortOrder(i);
            criterion.setActive(true);
            criteria.add(criterion);
        }
        when(criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(pool))
                .thenReturn(criteria);

        List<EvaluationResponse> responses = new ArrayList<>();
        for (int i = 0; i < scores.size(); i++) {
            EvaluationResponse response = new EvaluationResponse();
            response.setId(new EvaluationResponseId(assignmentId, criteria.get(i).getCriterionId()));
            response.setScore(scores.get(i));
            response.setScoreSource(source);
            responses.add(response);
        }
        when(responseRepository.findById_AssignmentId(assignmentId)).thenReturn(responses);

        submitted.add(assignment(assignmentId, profileId));
    }

    private static EvaluatorProfile profile(UUID profileId, EvaluatorType pool) {
        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setProfileId(profileId);
        profile.setEvaluatorType(pool);
        return profile;
    }

    private static EvaluationAssignment assignment(UUID assignmentId, UUID profileId) {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(assignmentId);
        assignment.setEvaluatorProfileId(profileId);
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignment.setSubmittedAt(Instant.parse("2026-09-12T10:00:00Z"));
        return assignment;
    }

    private static List<WeightConfig> seededWeights() {
        return List.of(weight(EvaluatorType.GOVERNMENT, "0.25"), weight(EvaluatorType.INDUSTRY, "0.15"),
                weight(EvaluatorType.HEI, "0.15"), weight(EvaluatorType.CITIZEN, "0.25"),
                weight(EvaluatorType.COMMUNITY, "0.20"));
    }

    private static WeightConfig weight(EvaluatorType pool, String value) {
        WeightConfig config = new WeightConfig();
        config.setEvaluatorType(pool);
        config.setWeight(new BigDecimal(value));
        return config;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> poolEntry(AggregationResponse response, EvaluatorType pool) {
        return (Map<String, Object>) response.perTypeScores().get(pool.name());
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<Map<String, Object>> afterCaptor() {
        return ArgumentCaptor.forClass(Map.class);
    }
}
