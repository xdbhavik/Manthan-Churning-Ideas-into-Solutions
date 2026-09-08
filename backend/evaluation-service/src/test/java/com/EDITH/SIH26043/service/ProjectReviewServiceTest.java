package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.PortalGateway;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.entity.ProjectReview;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.ProjectReviewStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ProjectReviewRepository;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateRequest;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateResponse;
import com.EDITH.SIH26043.web.dto.ProjectReviewDetailView;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Project reviews: a portal submission becomes a work item in the queue of the
 * SAME evaluator who scored the problem's cycle, and only that evaluator may
 * decide it. Create is idempotent on {@code (submissionId, round)}; decide is
 * owner-scoped and status-guarded, then pushes the outcome best-effort back to
 * portal.
 */
class ProjectReviewServiceTest {

    private final ProjectReviewRepository reviewRepository = mock(ProjectReviewRepository.class);
    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final EvaluationAssignmentRepository assignmentRepository =
            mock(EvaluationAssignmentRepository.class);
    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final AuditService auditService = mock(AuditService.class);
    private final PortalGateway portalGateway = mock(PortalGateway.class);

    private final ProjectReviewService service = new ProjectReviewService(
            reviewRepository, cycleRepository, assignmentRepository, profileRepository,
            auditService, portalGateway);

    private final UUID userId = UUID.randomUUID();
    private final UUID profileId = UUID.randomUUID();
    private final UUID submissionId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID projectReviewId = UUID.randomUUID();

    // ------------------------------------------------------------------ create

    @Test
    void create_AssignsTheReviewToTheEvaluatorWhoScoredTheCycle() {
        givenProfile();
        givenCompletedCycle();
        when(reviewRepository.findBySubmissionIdAndRound(submissionId, 1))
                .thenReturn(Optional.empty());
        when(assignmentRepository.findByCycleIdAndStatusIn(eq(cycleId), anyCollection()))
                .thenReturn(List.of(submittedAssignment()));
        when(profileRepository.findById(profileId)).thenReturn(Optional.of(profile()));
        when(reviewRepository.save(any(ProjectReview.class))).thenAnswer(inv -> {
            ProjectReview review = inv.getArgument(0);
            if (review.getProjectReviewId() == null) {
                review.setProjectReviewId(UUID.randomUUID());
            }
            return review;
        });

        ProjectReviewCreateResponse response = service.createInternal(request(1));

        assertThat(response.reviewerUserId()).isEqualTo(userId);
        assertThat(response.evaluatorProfileId()).isEqualTo(profileId);
        assertThat(response.status()).isEqualTo(ProjectReviewStatus.ASSIGNED.name());

        ArgumentCaptor<ProjectReview> saved = ArgumentCaptor.forClass(ProjectReview.class);
        verify(reviewRepository).save(saved.capture());
        assertThat(saved.getValue().getSubmissionId()).isEqualTo(submissionId);
        assertThat(saved.getValue().getRound()).isEqualTo(1);
        assertThat(saved.getValue().getCycleId()).isEqualTo(cycleId);
        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.PROJECT_REVIEW_ASSIGNED), eq(userId), isNull(), anyMap(), eq("internal"));
    }

    @Test
    void create_DefaultsTheRoundToOneWhenThePushOmitsIt() {
        givenProfile();
        givenCompletedCycle();
        when(reviewRepository.findBySubmissionIdAndRound(submissionId, 1))
                .thenReturn(Optional.empty());
        when(assignmentRepository.findByCycleIdAndStatusIn(eq(cycleId), anyCollection()))
                .thenReturn(List.of(submittedAssignment()));
        when(profileRepository.findById(profileId)).thenReturn(Optional.of(profile()));
        when(reviewRepository.save(any(ProjectReview.class))).thenAnswer(inv -> {
            ProjectReview review = inv.getArgument(0);
            if (review.getProjectReviewId() == null) {
                review.setProjectReviewId(UUID.randomUUID());
            }
            return review;
        });

        ProjectReviewCreateResponse response = service.createInternal(request(null));

        assertThat(response.reviewerUserId()).isEqualTo(userId);
        ArgumentCaptor<ProjectReview> saved = ArgumentCaptor.forClass(ProjectReview.class);
        verify(reviewRepository).save(saved.capture());
        assertThat(saved.getValue().getRound()).isEqualTo(1);
    }

    @Test
    void create_MissingCycleIsAConflict() {
        when(cycleRepository.findByProblemId(problemId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createInternal(request(1)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("PROBLEM_NOT_EVALUATED");
                });
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void create_AnIncompleteCycleIsAConflict() {
        EvaluationCycle cycle = cycle(EvaluationStatus.EVALUATION_IN_PROGRESS);
        when(cycleRepository.findByProblemId(problemId)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.createInternal(request(1)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void create_NoSubmittedAssignmentIsAConflict() {
        givenCompletedCycle();
        when(reviewRepository.findBySubmissionIdAndRound(submissionId, 1))
                .thenReturn(Optional.empty());
        when(assignmentRepository.findByCycleIdAndStatusIn(eq(cycleId), anyCollection()))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.createInternal(request(1)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("no submitted evaluation assignment");
                });
    }

    @Test
    void create_IsIdempotentOnSubmissionAndRound() {
        givenProfile();
        givenCompletedCycle();
        ProjectReview existing = review(ProjectReviewStatus.ASSIGNED);
        when(reviewRepository.findBySubmissionIdAndRound(submissionId, 2))
                .thenReturn(Optional.of(existing));

        ProjectReviewCreateResponse response = service.createInternal(request(2));

        assertThat(response.projectReviewId()).isEqualTo(existing.getProjectReviewId());
        assertThat(response.reviewerUserId()).isEqualTo(existing.getReviewerUserId());
        verify(reviewRepository, never()).save(any());
        verify(assignmentRepository, never()).findByCycleIdAndStatusIn(any(), anyCollection());
    }

    // ------------------------------------------------------------------ decide

    @Test
    void decide_AnotherEvaluatorsReviewIsForbidden() {
        givenProfile();
        ProjectReview someoneElses = review(ProjectReviewStatus.ASSIGNED);
        someoneElses.setEvaluatorProfileId(UUID.randomUUID());
        when(reviewRepository.findById(projectReviewId)).thenReturn(Optional.of(someoneElses));

        assertThatThrownBy(() -> service.decide(userId, projectReviewId, "ACCEPTED", null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void decide_OnlyAnAssignedReviewCanBeDecided() {
        givenProfile();
        ProjectReview decided = review(ProjectReviewStatus.ACCEPTED);
        when(reviewRepository.findById(projectReviewId)).thenReturn(Optional.of(decided));

        assertThatThrownBy(() -> service.decide(userId, projectReviewId, "ACCEPTED", null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void decide_RejectsAnUnknownDecisionWord() {
        givenProfile();
        ProjectReview assigned = review(ProjectReviewStatus.ASSIGNED);
        when(reviewRepository.findById(projectReviewId)).thenReturn(Optional.of(assigned));

        assertThatThrownBy(() -> service.decide(userId, projectReviewId, "MAYBE", null))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void decide_LandsADecisionAndNotifiesPortalBestEffort() {
        givenProfile();
        ProjectReview assigned = review(ProjectReviewStatus.ASSIGNED);
        when(reviewRepository.findById(projectReviewId)).thenReturn(Optional.of(assigned));

        ProjectReviewDetailView view = service.decide(userId, projectReviewId, "RETURNED",
                "Please add a demo video");

        assertThat(view.status()).isEqualTo(ProjectReviewStatus.RETURNED.name());
        assertThat(view.decisionComment()).isEqualTo("Please add a demo video");
        assertThat(assigned.getDecidedAt()).isNotNull();

        verify(reviewRepository).save(assigned);
        verify(portalGateway).notifyReviewResult(submissionId, "RETURNED", "Please add a demo video");
        verify(auditService).record(eq("PROBLEM"), eq(problemId),
                eq(AuditAction.PROJECT_REVIEW_DECIDED), eq(userId), anyMap(), anyMap(), eq("internal"));
    }

    @Test
    void decide_StillSucceedsWhenThePortalNotificationFails() {
        givenProfile();
        ProjectReview assigned = review(ProjectReviewStatus.ASSIGNED);
        when(reviewRepository.findById(projectReviewId)).thenReturn(Optional.of(assigned));
        org.mockito.Mockito.doThrow(new ApiException(HttpStatus.BAD_GATEWAY, "portal down"))
                .when(portalGateway).notifyReviewResult(submissionId, "ACCEPTED", null);

        ProjectReviewDetailView view = service.decide(userId, projectReviewId, "ACCEPTED", null);

        assertThat(view.status()).isEqualTo(ProjectReviewStatus.ACCEPTED.name());
        verify(reviewRepository).save(assigned);
    }

    // ------------------------------------------------------------------ fixtures

    private void givenProfile() {
        when(profileRepository.findByUserId(userId)).thenReturn(List.of(profile()));
    }

    private EvaluatorProfile profile() {
        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setProfileId(profileId);
        profile.setUserId(userId);
        return profile;
    }

    private void givenCompletedCycle() {
        when(cycleRepository.findByProblemId(problemId))
                .thenReturn(Optional.of(cycle(EvaluationStatus.EVALUATION_COMPLETED)));
    }

    private EvaluationCycle cycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(status);
        return cycle;
    }

    private EvaluationAssignment submittedAssignment() {
        EvaluationAssignment assignment = new EvaluationAssignment();
        assignment.setAssignmentId(UUID.randomUUID());
        assignment.setCycleId(cycleId);
        assignment.setEvaluatorProfileId(profileId);
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        return assignment;
    }

    private ProjectReview review(ProjectReviewStatus status) {
        ProjectReview review = new ProjectReview();
        review.setProjectReviewId(projectReviewId);
        review.setSubmissionId(submissionId);
        review.setProblemId(problemId);
        review.setCycleId(cycleId);
        review.setEvaluatorProfileId(profileId);
        review.setReviewerUserId(userId);
        review.setRound(1);
        review.setStatus(status);
        return review;
    }

    private ProjectReviewCreateRequest request(Integer round) {
        return new ProjectReviewCreateRequest(
                submissionId, problemId, cycleId, round,
                "Irregular drinking water supply", "Solar water pump", "A solar solution",
                null, List.of(), List.of());
    }
}
