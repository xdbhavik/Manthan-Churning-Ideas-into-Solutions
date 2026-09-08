package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationResponse;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationResponseRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.web.dto.AssignmentDetailResponse;
import com.EDITH.SIH26043.web.dto.AssignmentOutcomeResponse;
import com.EDITH.SIH26043.web.dto.MyAssignmentResponse;
import com.EDITH.SIH26043.web.dto.ScoreSubmissionRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The evaluator's own side of the pipeline. Two invariants carry most of the
 * weight here: an evaluator can only ever touch their own assignment (403
 * otherwise), and a scorecard is all-or-nothing — every active criterion of the
 * pool exactly once, none above its own maxScore — so aggregation never averages
 * a half-filled form.
 */
class EvaluatorAssignmentServiceTest {

    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository = mock(EvaluationAssignmentRepository.class);
    private final EvaluationResponseRepository responseRepository = mock(EvaluationResponseRepository.class);
    private final EvaluationCriterionRepository criterionRepository = mock(EvaluationCriterionRepository.class);
    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final ProblemAnalysisRepository analysisRepository = mock(ProblemAnalysisRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final ProblemContextGateway problemGateway = mock(ProblemContextGateway.class);

    private final EvaluatorAssignmentService service = new EvaluatorAssignmentService(
            profileRepository, assignmentRepository, responseRepository, criterionRepository,
            cycleRepository, analysisRepository, statusService, auditService, problemGateway);

    private final UUID userId = UUID.randomUUID();
    private final UUID profileId = UUID.randomUUID();
    private final UUID assignmentId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    private final EvaluationCriterion impact = criterion("impact", "Impact", 10, 1);
    private final EvaluationCriterion feasibility = criterion("feasibility", "Feasibility", 5, 2);

    // ------------------------------------------------------------------
    // profile + queue
    // ------------------------------------------------------------------

    @Test
    void anEvaluatorWithoutAProfileIsToldToAskAnAdmin() {
        when(profileRepository.findByUserId(userId)).thenReturn(List.of());

        assertThatThrownBy(() -> service.myAssignments(userId, null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getMessage()).contains("evaluator-profiles");
                });
    }

    @Test
    void myQueueReportsScoringProgressAndOverdueWork() {
        givenProfile();
        givenCriteria(impact, feasibility);
        EvaluationAssignment overdue = givenAssignment(AssignmentStatus.IN_PROGRESS);
        overdue.setDeadline(Instant.now().minus(1, ChronoUnit.DAYS));
        when(assignmentRepository.findByEvaluatorProfileIdOrderByDeadlineAsc(profileId))
                .thenReturn(List.of(overdue));
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        when(cycleRepository.findAllById(anyCollection())).thenReturn(List.of(cycle(EvaluationStatus.EVALUATION_IN_PROGRESS)));
        when(responseRepository.countById_AssignmentId(assignmentId)).thenReturn(1L);

        List<MyAssignmentResponse> queue = service.myAssignments(userId, null);

        assertThat(queue).hasSize(1);
        MyAssignmentResponse row = queue.getFirst();
        assertThat(row.problemId()).isEqualTo(problemId);
        assertThat(row.criteriaTotal()).isEqualTo(2);
        assertThat(row.criteriaScored()).isEqualTo(1);
        assertThat(row.overdue()).isTrue();
        assertThat(row.cycleStatus()).isEqualTo(EvaluationStatus.EVALUATION_IN_PROGRESS);
    }

    @Test
    void theQueueCanBeFilteredByStatus() {
        givenProfile();
        givenCriteria(impact);
        EvaluationAssignment submitted = givenAssignment(AssignmentStatus.SUBMITTED);
        when(assignmentRepository.findByEvaluatorProfileIdOrderByDeadlineAsc(profileId))
                .thenReturn(List.of(submitted));

        assertThat(service.myAssignments(userId, AssignmentStatus.ASSIGNED)).isEmpty();
    }

    @Test
    void theScoringScreenCarriesTheProblemAndTheBlankScorecard() {
        givenProfile();
        givenCriteria(impact, feasibility);
        givenAssignment(AssignmentStatus.ASSIGNED);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        givenProblemContext();

        AssignmentDetailResponse detail = service.assignmentDetail(userId, assignmentId);

        assertThat(detail.problem()).isNotNull();
        assertThat(detail.problem().title()).isEqualTo("Irregular drinking water supply");
        // No analysis row was written for this cycle — advisory context is simply absent.
        assertThat(detail.analysis()).isNull();
        assertThat(detail.criteria()).extracting(c -> c.myScore()).containsOnlyNulls();
        assertThat(detail.criteria()).extracting(c -> c.maxScore()).containsExactly(10, 5);
        assertThat(detail.assignment().criteriaScored()).isZero();
    }

    @Test
    void theScoringScreenStillRendersWhenProblemServiceIsDown() {
        givenProfile();
        givenCriteria(impact, feasibility);
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        when(problemGateway.fetch(problemId))
                .thenThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "problem-service down"));
        when(responseRepository.findById_AssignmentId(assignmentId))
                .thenReturn(List.of(response(impact, 7, "solid")));

        AssignmentDetailResponse detail = service.assignmentDetail(userId, assignmentId);

        assertThat(detail.problem()).isNull();
        assertThat(detail.criteria()).hasSize(2);
        assertThat(detail.criteria().getFirst().myScore()).isEqualTo(7);
        assertThat(detail.criteria().get(1).myScore()).isNull();
        assertThat(detail.assignment().criteriaScored()).isEqualTo(1);
    }

    @Test
    void anotherEvaluatorsAssignmentIsForbidden() {
        givenProfile();
        EvaluationAssignment someoneElses = givenAssignment(AssignmentStatus.ASSIGNED);
        someoneElses.setEvaluatorProfileId(UUID.randomUUID());

        assertThatThrownBy(() -> service.assignmentDetail(userId, assignmentId))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ------------------------------------------------------------------
    // accept / decline
    // ------------------------------------------------------------------

    @Test
    void acceptingClaimsTheAssignment() {
        givenProfile();
        givenAssignment(AssignmentStatus.ASSIGNED);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);

        AssignmentOutcomeResponse outcome = service.accept(userId, assignmentId, "127.0.0.1");

        assertThat(outcome.status()).isEqualTo(AssignmentStatus.IN_PROGRESS);
        verify(assignmentRepository).save(any(EvaluationAssignment.class));
        verify(auditService).record(eq("PROBLEM"), eq(problemId), eq(AuditAction.STATUS_CHANGED),
                eq(userId), anyMap(), anyMap(), eq("127.0.0.1"));
    }

    @Test
    void acceptingTwiceIsANoOp() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);

        AssignmentOutcomeResponse outcome = service.accept(userId, assignmentId, "127.0.0.1");

        assertThat(outcome.status()).isEqualTo(AssignmentStatus.IN_PROGRESS);
        assertThat(outcome.message()).contains("Already accepted");
        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void acceptingAfterTheDeadlineExpiresTheAssignment() {
        givenProfile();
        EvaluationAssignment late = givenAssignment(AssignmentStatus.ASSIGNED);
        late.setDeadline(Instant.now().minus(2, ChronoUnit.DAYS));

        assertThatThrownBy(() -> service.accept(userId, assignmentId, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("EXPIRED");
                });

        assertThat(late.getStatus()).isEqualTo(AssignmentStatus.EXPIRED);
        verify(assignmentRepository).save(late);
    }

    @Test
    void decliningTheOnlyAssignmentReopensTheCycleForRouting() {
        givenProfile();
        EvaluationAssignment assignment = givenAssignment(AssignmentStatus.ASSIGNED);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);

        AssignmentOutcomeResponse outcome =
                service.decline(userId, assignmentId, "Conflict of interest", "127.0.0.1");

        assertThat(outcome.status()).isEqualTo(AssignmentStatus.DECLINED);
        assertThat(outcome.message()).contains("reopened for routing");
        assertThat(assignment.getFeedback()).isEqualTo("Declined: Conflict of interest");
        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.ROUTING),
                eq(userId), anyString());
    }

    @Test
    void decliningLeavesTheCycleRunningWhileOthersAreStillOpen() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        when(assignmentRepository.findByCycleIdAndStatusIn(eq(cycleId), anyCollection()))
                .thenReturn(List.of(new EvaluationAssignment())); // a co-evaluator is still working

        AssignmentOutcomeResponse outcome = service.decline(userId, assignmentId, null, "127.0.0.1");

        assertThat(outcome.status()).isEqualTo(AssignmentStatus.DECLINED);
        assertThat(outcome.message()).isEqualTo("Declined");
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void aSubmittedAssignmentCannotBeDeclined() {
        givenProfile();
        givenAssignment(AssignmentStatus.SUBMITTED);
        givenCycle(EvaluationStatus.EVALUATION_COMPLETED);

        assertThatThrownBy(() -> service.decline(userId, assignmentId, null, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    // ------------------------------------------------------------------
    // submit
    // ------------------------------------------------------------------

    @Test
    void aCompleteScorecardIsStoredAndCompletesTheCycle() {
        givenProfile();
        EvaluationAssignment assignment = givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        givenCriteria(impact, feasibility);

        AssignmentOutcomeResponse outcome = service.submit(userId, assignmentId,
                request(score(impact, 9, "high reach"), score(feasibility, 4, null)),
                "127.0.0.1");

        assertThat(outcome.status()).isEqualTo(AssignmentStatus.SUBMITTED);
        assertThat(outcome.criteriaScored()).isEqualTo(2);
        assertThat(outcome.message()).contains("EVALUATION_COMPLETED");
        assertThat(assignment.getSubmittedAt()).isNotNull();
        assertThat(assignment.isConflictRecheck()).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EvaluationResponse>> rows = ArgumentCaptor.forClass(List.class);
        verify(responseRepository).saveAll(rows.capture());
        assertThat(rows.getValue()).extracting(r -> r.getId().getCriterionId())
                .containsExactly(impact.getCriterionId(), feasibility.getCriterionId());
        assertThat(rows.getValue()).extracting(EvaluationResponse::getScore)
                .containsExactly(9, 4);

        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.EVALUATION_SUBMITTED), eq(userId), anyMap(), anyMap(), eq("127.0.0.1"));
        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.EVALUATION_COMPLETED),
                eq(userId), anyString());
    }

    @Test
    void criteriaMayBeIdentifiedByTheirFriendlyKey() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        givenCriteria(impact, feasibility);

        AssignmentOutcomeResponse outcome = service.submit(userId, assignmentId,
                request(new ScoreSubmissionRequest.CriterionScore(null, "impact", 6, null),
                        new ScoreSubmissionRequest.CriterionScore(null, "feasibility", 2, null)),
                "127.0.0.1");

        assertThat(outcome.criteriaScored()).isEqualTo(2);
    }

    @Test
    void aPartialScorecardIsRejected() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCriteria(impact, feasibility);

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getMessage()).contains("Missing: feasibility");
                });

        verify(responseRepository, never()).saveAll(any());
        verify(statusService, never()).transition(any(), any(), any(), anyString());
    }

    @Test
    void scoringTheSameCriterionTwiceIsRejected() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCriteria(impact, feasibility);

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null), score(impact, 3, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).contains("scored more than once"));
    }

    @Test
    void aScoreAboveTheCriterionsOwnMaxIsRejected() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCriteria(impact, feasibility);

        // feasibility caps at 5 even though the request DTO allows up to 10.
        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null), score(feasibility, 8, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).contains("exceeds maxScore 5"));
    }

    @Test
    void aCriterionFromAnotherPoolIsRejected() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCriteria(impact, feasibility);

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(new ScoreSubmissionRequest.CriterionScore(UUID.randomUUID(), null, 5, null)),
                "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).contains("not an active criterion"));
    }

    @Test
    void resubmittingAClosedScorecardIsRejected() {
        givenProfile();
        givenAssignment(AssignmentStatus.SUBMITTED);

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("already submitted");
                });
    }

    @Test
    void submittingAfterTheDeadlineExpiresTheAssignment() {
        givenProfile();
        EvaluationAssignment late = givenAssignment(AssignmentStatus.IN_PROGRESS);
        late.setDeadline(Instant.now().minus(1, ChronoUnit.HOURS));

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).contains("EXPIRED"));

        assertThat(late.getStatus()).isEqualTo(AssignmentStatus.EXPIRED);
        verify(responseRepository, never()).saveAll(any());
    }

    @Test
    void aPoolWithoutCriteriaCannotBeScored() {
        givenProfile();
        givenAssignment(AssignmentStatus.IN_PROGRESS);
        givenCriteria();

        assertThatThrownBy(() -> service.submit(userId, assignmentId,
                request(score(impact, 9, null)), "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("No active criteria");
                });
    }

    // ------------------------------------------------------------------
    // fixtures
    // ------------------------------------------------------------------

    private void givenProfile() {
        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setProfileId(profileId);
        profile.setUserId(userId);
        profile.setEvaluatorType(EvaluatorType.GOVERNMENT);
        profile.setFullName("Gov Evaluator");
        profile.setMaxWorkload(5);
        profile.setActive(true);
        when(profileRepository.findByUserId(userId)).thenReturn(List.of(profile));
    }

    private EvaluationAssignment givenAssignment(AssignmentStatus status) {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(assignmentId);
        assignment.setCycleId(cycleId);
        assignment.setEvaluatorProfileId(profileId);
        assignment.setStatus(status);
        assignment.setAssignedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        assignment.setDeadline(Instant.now().plus(7, ChronoUnit.DAYS));
        if (status == AssignmentStatus.SUBMITTED) {
            assignment.setSubmittedAt(Instant.now());
        }
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
        return assignment;
    }

    private void givenCycle(EvaluationStatus status) {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle(status)));
    }

    private EvaluationCycle cycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(status);
        return cycle;
    }

    private void givenCriteria(EvaluationCriterion... criteria) {
        when(criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(
                EvaluatorType.GOVERNMENT)).thenReturn(List.of(criteria));
    }

    private EvaluationCriterion criterion(String key, String label, int maxScore, int sortOrder) {
        EvaluationCriterion criterion = new EvaluationCriterion();
        criterion.setCriterionId(UUID.randomUUID());
        criterion.setEvaluatorType(EvaluatorType.GOVERNMENT);
        criterion.setCriterionKey(key);
        criterion.setCriterionLabel(label);
        criterion.setMaxScore(maxScore);
        criterion.setSortOrder(sortOrder);
        criterion.setActive(true);
        return criterion;
    }

    private EvaluationResponse response(EvaluationCriterion criterion, int score, String comment) {
        EvaluationResponse response = new EvaluationResponse();
        response.setId(new com.EDITH.SIH26043.entity.EvaluationResponseId(
                assignmentId, criterion.getCriterionId()));
        response.setScore(score);
        response.setComment(comment);
        return response;
    }

    private ScoreSubmissionRequest.CriterionScore score(EvaluationCriterion criterion, int value,
                                                        String comment) {
        return new ScoreSubmissionRequest.CriterionScore(
                criterion.getCriterionId(), null, value, comment);
    }

    private ScoreSubmissionRequest request(ScoreSubmissionRequest.CriterionScore... scores) {
        List<ScoreSubmissionRequest.CriterionScore> list = new ArrayList<>(List.of(scores));
        return new ScoreSubmissionRequest(list, "Well-evidenced problem", "Prioritize for pilot");
    }

    /** The problem body the evaluator reads before scoring, from problem-service. */
    private void givenProblemContext() {
        when(problemGateway.fetch(problemId)).thenReturn(new ProblemContextResponse(
                problemId, "REGISTERED", "Irregular drinking water supply",
                "Hand pumps dry during summer.", "GOVT", null, null, null, null,
                null, null, null, List.of(), 0, null, List.of()));
    }
}
