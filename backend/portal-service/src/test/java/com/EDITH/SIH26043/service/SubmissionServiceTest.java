package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.CodeJudgeEvaluationRequest;
import com.EDITH.SIH26043.client.CodeJudgeGateway;
import com.EDITH.SIH26043.client.EvaluationGateway;
import com.EDITH.SIH26043.client.ProjectReviewCreateRequest;
import com.EDITH.SIH26043.client.ProjectReviewCreateResponse;
import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.entity.Submission;
import com.EDITH.SIH26043.entity.SubmissionFile;
import com.EDITH.SIH26043.entity.Team;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.SubmissionStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.repository.SubmissionFileRepository;
import com.EDITH.SIH26043.repository.SubmissionRepository;
import com.EDITH.SIH26043.repository.TeamMemberRepository;
import com.EDITH.SIH26043.repository.TeamRepository;
import com.EDITH.SIH26043.web.dto.ReviewResultPushRequest;
import com.EDITH.SIH26043.web.dto.SubmissionCreateRequest;
import com.EDITH.SIH26043.web.dto.SubmissionView;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The project submission lifecycle. Two invariants matter: every participant on a
 * submission (leader AND each team member) must be able to see the problem under
 * its access rule, and submitting is atomic with opening the evaluation-service
 * review — if the push fails the transaction rolls back rather than persist a
 * SUBMITTED-without-review row.
 *
 * <p>The CodeJudge hand-off is the deliberate exception: it is best effort. A
 * repo-backed round must pin its commit (the gate is enforced here, up front), but
 * once the round is persisted an unreachable codejudge-service costs the student
 * nothing — the automated run is advisory to the human reviewer.</p>
 */
class SubmissionServiceTest {

    private final SubmissionRepository submissionRepository = mock(SubmissionRepository.class);
    private final PublishedProblemRepository problemRepository = mock(PublishedProblemRepository.class);
    private final ParticipantRepository participantRepository = mock(ParticipantRepository.class);
    private final TeamRepository teamRepository = mock(TeamRepository.class);
    private final TeamMemberRepository teamMemberRepository = mock(TeamMemberRepository.class);
    private final SubmissionFileRepository fileRepository = mock(SubmissionFileRepository.class);
    private final ParticipantService participantService = mock(ParticipantService.class);
    private final EvaluationGateway evaluationGateway = mock(EvaluationGateway.class);
    private final CodeJudgeGateway codeJudgeGateway = mock(CodeJudgeGateway.class);

    private final SubmissionService service = new SubmissionService(
            submissionRepository, problemRepository, participantRepository, teamRepository,
            teamMemberRepository, fileRepository, participantService, evaluationGateway,
            codeJudgeGateway);

    private final UUID problemId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID leaderId = UUID.randomUUID();
    private final UUID leaderUserId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private final UUID memberUserId = UUID.randomUUID();
    private final UUID submissionId = UUID.randomUUID();
    private final UUID reviewerUserId = UUID.randomUUID();

    private final Participant leader = participant(leaderId, leaderUserId, "Aarav");
    private final Participant member = participant(memberId, memberUserId, "Diya");
    private final PublishedProblem problem = openProblem();

    // ------------------------------------------------------------------ create

    @Test
    void create_StartsAnIndividualDraftForAVisibleProblem() {
        givenProblem();
        givenCanSee(leader, true);
        givenSubmissionSaveAssignsId();

        SubmissionView view = service.create(leader,
                new SubmissionCreateRequest(problemId, "Solar water pump", "A solar solution", null,
                        null, null, null, null, List.of()));

        assertThat(view.problemId()).isEqualTo(problemId);
        assertThat(view.teamId()).isNull();
        assertThat(view.status()).isEqualTo(SubmissionStatus.DRAFT.name());

        ArgumentCaptor<Submission> saved = ArgumentCaptor.forClass(Submission.class);
        verify(submissionRepository).save(saved.capture());
        assertThat(saved.getValue().getSubmitterParticipantId()).isEqualTo(leaderId);
        assertThat(saved.getValue().getTeamId()).isNull();
    }

    @Test
    void create_RefusesAProblemTheLeaderCannotSee() {
        givenProblem();
        givenCanSee(leader, false);

        assertThatThrownBy(() -> service.create(leader,
                new SubmissionCreateRequest(problemId, "t", null, null, null, null, null, null,
                        List.of())))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void create_RequiresInvitationAcceptanceBeforeAddingMembers() {
        givenProblem();
        givenCanSee(leader, true);
        givenProblem();
        assertThatThrownBy(() -> service.create(leader,
                new SubmissionCreateRequest(problemId, "Solar water pump", "A solar solution", null,
                        null, null, null, "Solar Squad", List.of(memberId))))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(teamRepository, never()).save(any(Team.class));
    }

    @Test
    void create_RejectsATeamMemberWhoCannotSeeTheProblem() {
        givenProblem();
        givenCanSee(leader, true);
        assertThatThrownBy(() -> service.create(leader,
                new SubmissionCreateRequest(problemId, "t", "s", null, null, null, null,
                        "Solar Squad", List.of(memberId))))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(submissionRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ submit

    @Test
    void submit_SnapshotsFilesOpensAReviewAndLandsOnUnderReview() {
        Submission submission = submission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);
        givenFile(submission);
        givenProblem();
        when(evaluationGateway.createProjectReview(any(ProjectReviewCreateRequest.class)))
                .thenReturn(new ProjectReviewCreateResponse(
                        UUID.randomUUID(), reviewerUserId, UUID.randomUUID(), "ASSIGNED"));

        SubmissionView view = service.submit(submissionId, leader);

        assertThat(view.status()).isEqualTo(SubmissionStatus.UNDER_REVIEW.name());
        assertThat(view.reviewRound()).isEqualTo(1);
        assertThat(view.reviewerUserId()).isEqualTo(reviewerUserId);

        ArgumentCaptor<ProjectReviewCreateRequest> pushed =
                ArgumentCaptor.forClass(ProjectReviewCreateRequest.class);
        verify(evaluationGateway).createProjectReview(pushed.capture());
        assertThat(pushed.getValue().problemId()).isEqualTo(problemId);
        assertThat(pushed.getValue().cycleId()).isEqualTo(cycleId);
        assertThat(pushed.getValue().round()).isEqualTo(1);
        assertThat(pushed.getValue().files()).hasSize(1);

        verify(submissionRepository).save(submission);
    }

    @Test
    void submit_RequiresAtLeastOneArtifactBeforePushing() {
        Submission submission = submission(SubmissionStatus.DRAFT, 0);
        submission.setTitle(null);
        submission.setSummary(null);
        submission.setGithubUrl(null);
        submission.setLinks(null);
        givenSubmission(submission);
        givenProblem();

        assertThatThrownBy(() -> service.submit(submissionId, leader))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(evaluationGateway, never()).createProjectReview(any());
    }

    @Test
    void submit_IsOnlyAllowedWhileDraftOrReturned() {
        Submission submission = submission(SubmissionStatus.UNDER_REVIEW, 1);
        givenSubmission(submission);

        assertThatThrownBy(() -> service.submit(submissionId, leader))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(evaluationGateway, never()).createProjectReview(any());
    }

    @Test
    void resubmit_AfterReturnedBumpsTheReviewRound() {
        Submission submission = submission(SubmissionStatus.RETURNED, 1);
        givenSubmission(submission);
        givenFile(submission);
        givenProblem();
        when(evaluationGateway.createProjectReview(any(ProjectReviewCreateRequest.class)))
                .thenReturn(new ProjectReviewCreateResponse(
                        UUID.randomUUID(), reviewerUserId, UUID.randomUUID(), "ASSIGNED"));

        SubmissionView view = service.submit(submissionId, leader);

        assertThat(view.reviewRound()).isEqualTo(2);
        ArgumentCaptor<ProjectReviewCreateRequest> pushed =
                ArgumentCaptor.forClass(ProjectReviewCreateRequest.class);
        verify(evaluationGateway).createProjectReview(pushed.capture());
        assertThat(pushed.getValue().round()).isEqualTo(2);
    }

    @Test
    void submit_WhenEvaluationIsDownLeavesTheDraftUntouched() {
        Submission submission = submission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);
        givenFile(submission);
        givenProblem();
        when(evaluationGateway.createProjectReview(any(ProjectReviewCreateRequest.class)))
                .thenThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "eval down"));

        assertThatThrownBy(() -> service.submit(submissionId, leader))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.DRAFT);
        verify(submissionRepository, never()).save(any());
    }

    // ------------------------------------------------- codejudge hand-off (W1)

    @Test
    void submit_RefusesAGithubSubmissionWithNoPinnedCommit() {
        Submission submission = githubSubmission(SubmissionStatus.DRAFT, 0);
        submission.setCommitSha(null);
        givenSubmission(submission);
        givenFile(submission);
        givenProblem();

        assertThatThrownBy(() -> service.submit(submissionId, leader))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(evaluationGateway, never()).createProjectReview(any());
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void submit_QueuesTheAutomatedRunForAPinnedRepoSubmission() {
        Submission submission = githubSubmission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);
        givenProblem();
        givenReviewAssigned();

        service.submit(submissionId, leader);

        ArgumentCaptor<CodeJudgeEvaluationRequest> queued =
                ArgumentCaptor.forClass(CodeJudgeEvaluationRequest.class);
        verify(codeJudgeGateway).queueEvaluation(queued.capture(), eq(leader.getUserId()));
        assertThat(queued.getValue().portalSubmissionId()).isEqualTo(submissionId);
        assertThat(queued.getValue().problemId()).isEqualTo(problemId);
        assertThat(queued.getValue().repositoryUrl()).isEqualTo("https://github.com/aarav/pump");
        assertThat(queued.getValue().commitSha()).isEqualTo("a1b2c3d");
        assertThat(queued.getValue().branch()).isEqualTo("main");
    }

    @Test
    void submit_SurvivesACodeJudgeOutage() {
        Submission submission = githubSubmission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);
        givenProblem();
        givenReviewAssigned();
        when(codeJudgeGateway.queueEvaluation(any(CodeJudgeEvaluationRequest.class), any()))
                .thenThrow(new RuntimeException("codejudge unreachable"));

        SubmissionView view = service.submit(submissionId, leader);

        // The human review is the gate; a dead automated run never costs the submit.
        assertThat(view.status()).isEqualTo(SubmissionStatus.UNDER_REVIEW.name());
        verify(submissionRepository).save(submission);
    }

    @Test
    void submit_SkipsTheAutomatedRunForAFileOnlySubmission() {
        Submission submission = submission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);
        givenFile(submission);
        givenProblem();
        givenReviewAssigned();

        service.submit(submissionId, leader);

        // Nothing to clone — the round goes to the human reviewer exactly as before.
        verify(codeJudgeGateway, never()).queueEvaluation(any(), any());
    }

    // ------------------------------------------------------- review-result push

    @Test
    void acceptReviewResult_LandsAnAcceptedDecision() {
        Submission submission = submission(SubmissionStatus.UNDER_REVIEW, 1);
        givenSubmission(submission);

        SubmissionView view = service.acceptReviewResult(submissionId,
                new ReviewResultPushRequest("ACCEPTED", "Great work"));

        assertThat(view.status()).isEqualTo(SubmissionStatus.ACCEPTED.name());
        assertThat(view.decisionComment()).isEqualTo("Great work");
        assertThat(submission.getDecidedAt()).isNotNull();
        verify(submissionRepository).save(submission);
    }

    @Test
    void acceptReviewResult_IsIdempotentForADecidedSubmission() {
        Submission submission = submission(SubmissionStatus.ACCEPTED, 1);
        givenSubmission(submission);

        SubmissionView view = service.acceptReviewResult(submissionId,
                new ReviewResultPushRequest("RETURNED", "late duplicate"));

        assertThat(view.status()).isEqualTo(SubmissionStatus.ACCEPTED.name());
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void acceptReviewResult_RejectsADecisionOutsideUnderReview() {
        Submission submission = submission(SubmissionStatus.DRAFT, 0);
        givenSubmission(submission);

        assertThatThrownBy(() -> service.acceptReviewResult(submissionId,
                new ReviewResultPushRequest("ACCEPTED", null)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void acceptReviewResult_RejectsAUnknownDecision() {
        Submission submission = submission(SubmissionStatus.UNDER_REVIEW, 1);
        givenSubmission(submission);

        assertThatThrownBy(() -> service.acceptReviewResult(submissionId,
                new ReviewResultPushRequest("MAYBE", null)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------ helpers

    private void givenProblem() {
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
    }

    private void givenSubmission(Submission submission) {
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    }

    private void givenFile(Submission submission) {
        SubmissionFile file = new SubmissionFile();
        file.setFileId(UUID.randomUUID());
        file.setSubmissionId(submission.getSubmissionId());
        file.setOriginalName("proposal.pdf");
        file.setContentType("application/pdf");
        file.setSizeBytes(1024);
        file.setSha256("abc");
        when(fileRepository.findBySubmissionIdOrderByUploadedAtAsc(submissionId))
                .thenReturn(List.of(file));
    }

    private void givenCanSee(Participant participant, boolean allowed) {
        when(participantService.canSee(participant, problem)).thenReturn(allowed);
    }

    private void givenReviewAssigned() {
        when(evaluationGateway.createProjectReview(any(ProjectReviewCreateRequest.class)))
                .thenReturn(new ProjectReviewCreateResponse(
                        UUID.randomUUID(), reviewerUserId, UUID.randomUUID(), "ASSIGNED"));
    }

    private void givenSubmissionSaveAssignsId() {
        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> {
            Submission submission = inv.getArgument(0);
            if (submission.getSubmissionId() == null) {
                submission.setSubmissionId(UUID.randomUUID());
            }
            return submission;
        });
    }

    private void givenTeamSaveAssignsId() {
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
            Team team = inv.getArgument(0);
            if (team.getTeamId() == null) {
                team.setTeamId(UUID.randomUUID());
            }
            return team;
        });
    }

    private PublishedProblem openProblem() {
        PublishedProblem problem = new PublishedProblem();
        problem.setProblemId(problemId);
        problem.setCycleId(cycleId);
        problem.setTitle("Irregular drinking water supply");
        problem.setAccessRule(ProblemAccessRule.OPEN_TO_ALL);
        return problem;
    }

    private Submission submission(SubmissionStatus status, int round) {
        Submission submission = new Submission();
        submission.setSubmissionId(submissionId);
        submission.setProblemId(problemId);
        submission.setSubmitterParticipantId(leaderId);
        submission.setTitle("Solar water pump");
        submission.setSummary("A solar-powered solution");
        submission.setLinks(List.of(Map.of("label", "Design", "url", "https://example.com")));
        submission.setStatus(status);
        submission.setReviewRound(round);
        return submission;
    }

    /** The same draft, but repo-backed with the commit the student wants judged. */
    private Submission githubSubmission(SubmissionStatus status, int round) {
        Submission submission = submission(status, round);
        submission.setGithubUrl("https://github.com/aarav/pump");
        submission.setCommitSha("a1b2c3d");
        submission.setBranch("main");
        return submission;
    }

    private Participant participant(UUID id, UUID userId, String name) {
        Participant participant = new Participant();
        participant.setParticipantId(id);
        participant.setUserId(userId);
        participant.setParticipantType(ParticipantType.STUDENT);
        participant.setFullName(name);
        return participant;
    }
}
