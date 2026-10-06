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
import com.EDITH.SIH26043.entity.TeamMember;
import com.EDITH.SIH26043.entity.TeamMemberId;
import com.EDITH.SIH26043.enums.SubmissionStatus;
import com.EDITH.SIH26043.enums.TeamRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.repository.SubmissionFileRepository;
import com.EDITH.SIH26043.repository.SubmissionRepository;
import com.EDITH.SIH26043.repository.TeamMemberRepository;
import com.EDITH.SIH26043.repository.TeamRepository;
import com.EDITH.SIH26043.web.dto.FileItemView;
import com.EDITH.SIH26043.web.dto.ParticipantBrief;
import com.EDITH.SIH26043.web.dto.ReviewResultPushRequest;
import com.EDITH.SIH26043.web.dto.SubmissionCreateRequest;
import com.EDITH.SIH26043.web.dto.SubmissionMetaRequest;
import com.EDITH.SIH26043.web.dto.SubmissionView;
import com.EDITH.SIH26043.web.dto.TeamView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Project submissions against published problems. A submission is a DRAFT first;
 * uploading files and editing meta happen while DRAFT or RETURNED. Submitting
 * pushes a project-review work item to evaluation-service (assigned to the
 * evaluator who scored the problem) and only then advances to UNDER_REVIEW — if
 * the push fails the transaction rolls back and the draft is untouched.
 */
@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

    private static final Set<SubmissionStatus> ACTIVE_STATUSES = Set.of(
            SubmissionStatus.DRAFT, SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW);

    private final SubmissionRepository submissionRepository;
    private final PublishedProblemRepository problemRepository;
    private final ParticipantRepository participantRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final SubmissionFileRepository fileRepository;
    private final ParticipantService participantService;
    private final EvaluationGateway evaluationGateway;
    private final CodeJudgeGateway codeJudgeGateway;

    public SubmissionService(SubmissionRepository submissionRepository,
                             PublishedProblemRepository problemRepository,
                             ParticipantRepository participantRepository,
                             TeamRepository teamRepository,
                             TeamMemberRepository teamMemberRepository,
                             SubmissionFileRepository fileRepository,
                             ParticipantService participantService,
                             EvaluationGateway evaluationGateway,
                             CodeJudgeGateway codeJudgeGateway) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
        this.participantRepository = participantRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.fileRepository = fileRepository;
        this.participantService = participantService;
        this.evaluationGateway = evaluationGateway;
        this.codeJudgeGateway = codeJudgeGateway;
    }

    // ------------------------------------------------------------------ create

    /** Creates a DRAFT submission (individual or team) against a visible problem. */
    @Transactional
    public SubmissionView create(Participant me, SubmissionCreateRequest request) {
        PublishedProblem problem = requireVisible(me, request.problemId());

        List<UUID> memberIds = request.memberUserIds() == null
                ? List.of() : request.memberUserIds();
        if (!memberIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invite students from Teams first; they join only after accepting the invitation");
        }
        boolean teamMode = request.teamId() != null;
        if (!teamMode && request.teamName() != null && !request.teamName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Create your team from the Teams screen before starting a team submission");
        }

        UUID teamId = null;
        if (teamMode) {
            if (request.teamId() != null) {
                Team team = teamRepository.findById(request.teamId())
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
                if (!team.getProblemId().equals(problem.getProblemId()))
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Team is linked to a different problem");
                if (!teamMemberRepository.existsById(new TeamMemberId(team.getTeamId(), me.getParticipantId())))
                    throw new ApiException(HttpStatus.FORBIDDEN, "You must accept a team invitation to join this team");
                teamId = team.getTeamId();
            }
        } else if (submissionRepository
                .existsByProblemIdAndSubmitterParticipantIdAndStatusIn(
                        problem.getProblemId(), me.getParticipantId(), ACTIVE_STATUSES)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "You already have an active submission for this problem");
        }

        Submission submission = new Submission();
        submission.setProblemId(problem.getProblemId());
        submission.setTeamId(teamId);
        submission.setSubmitterParticipantId(me.getParticipantId());
        applyMeta(submission, request.title(), request.summary(), request.githubUrl(),
                request.commitSha(), request.branch(), request.links(), request.projectDetails(), true);
        submissionRepository.save(submission);
        return toView(submission);
    }

    private UUID createTeam(Participant leader, PublishedProblem problem,
                            List<UUID> memberIds, String teamName) {
        Team team = new Team();
        team.setProblemId(problem.getProblemId());
        team.setName(teamName == null || teamName.isBlank()
                ? "Team for " + problem.getTitle() : teamName.trim());
        team.setCreatedByParticipantId(leader.getParticipantId());
        teamRepository.save(team);

        teamMemberRepository.save(newTeamMember(team.getTeamId(), leader, TeamRole.LEADER));

        Set<UUID> seen = new LinkedHashSet<>();
        for (UUID memberId : memberIds) {
            if (memberId == null || memberId.equals(leader.getParticipantId())) {
                continue;
            }
            if (!seen.add(memberId)) {
                continue;
            }
            Participant member = requireParticipant(memberId);
            if (!participantService.canSee(member, problem)) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Member " + memberId + " cannot see this problem under its access rule");
            }
            teamMemberRepository.save(newTeamMember(team.getTeamId(), member, TeamRole.MEMBER));
        }
        return team.getTeamId();
    }

    private TeamMember newTeamMember(UUID teamId, Participant p, TeamRole role) {
        TeamMember member = new TeamMember();
        member.setId(new TeamMemberId(teamId, p.getParticipantId()));
        member.setRole(role);
        return member;
    }

    // ------------------------------------------------------------ edit + submit

    /** Edits descriptive meta while the submission is DRAFT or RETURNED. */
    @Transactional
    public SubmissionView updateMeta(UUID submissionId, Participant me,
                                     SubmissionMetaRequest request) {
        Submission submission = requireSubmission(submissionId);
        requireActor(submission, me);
        requireEditable(submission);
        applyMeta(submission, request.title(), request.summary(), request.githubUrl(),
                request.commitSha(), request.branch(), request.links(), request.projectDetails(), false);
        submissionRepository.save(submission);
        return toView(submission);
    }

    /**
     * Submits the current round: bumps {@code reviewRound}, snapshots files,
     * asks evaluation-service to open a project review, then lands on
     * UNDER_REVIEW. A failed eval push rolls back the whole method so no
     * SUBMITTED-without-review row persists.
     *
     * <p>Once the round is persisted, a repo-backed submission is handed to
     * codejudge-service for an automated evaluation. That hand-off is <em>best
     * effort</em> — see {@link #triggerCodeJudge} — so it can never roll back a
     * student's submit.</p>
     */
    @Transactional
    public SubmissionView submit(UUID submissionId, Participant me) {
        Submission submission = requireSubmission(submissionId);
        requireActor(submission, me);
        if (submission.getStatus() != SubmissionStatus.DRAFT
                && submission.getStatus() != SubmissionStatus.RETURNED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only a DRAFT or RETURNED submission can be submitted");
        }

        List<SubmissionFile> files = fileRepository
                .findBySubmissionIdOrderByUploadedAtAsc(submissionId);
        requireArtifact(submission, files);
        requirePinnedCommit(submission);

        PublishedProblem problem = problemRepository.findById(submission.getProblemId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Published problem no longer exists"));

        int nextRound = submission.getReviewRound() + 1;
        ProjectReviewCreateResponse review = evaluationGateway.createProjectReview(
                new ProjectReviewCreateRequest(
                        submission.getSubmissionId(),
                        problem.getProblemId(),
                        problem.getCycleId(),
                        nextRound,
                        problem.getTitle(),
                        submission.getTitle(),
                        submission.getSummary(),
                        submission.getGithubUrl(),
                        submission.getLinks(),
                        toFileMetas(files)));

        submission.setReviewRound(nextRound);
        submission.setReviewerUserId(review.reviewerUserId());
        submission.setStatus(SubmissionStatus.UNDER_REVIEW);
        submission.setSubmittedAt(Instant.now());
        submissionRepository.save(submission);

        // Only after the round is persisted: an automated evaluation informs the
        // human reviewer, it is never a precondition of the submission.
        triggerCodeJudge(submission, problem.getTitle(), me.getUserId());

        return toView(submission);
    }

    /**
     * Queue the automated repository evaluation for a pinned, repo-backed round.
     *
     * <p>Best effort by design. The human project review opened above is the gate on
     * this submission, and CodeJudge's verdict is advisory to that reviewer — it
     * never accepts or returns a project. So an unreachable codejudge-service, a
     * rejected payload or a discovery miss is logged and dropped: the student still
     * gets their UNDER_REVIEW round, and the evaluation can be re-triggered later.</p>
     *
     * <p>File-only submissions are skipped outright: there is no repository to clone,
     * so they go to the human reviewer exactly as before.</p>
     *
     * @param ownerUserId the submitter (for a team round, the leader) — CodeJudge
     *                    scopes the run to them, since the portal hands off as a
     *                    service and cannot be identified by the student's own JWT
     */
    private void triggerCodeJudge(Submission submission, String problemTitle, UUID ownerUserId) {
        if (isBlank(submission.getGithubUrl())) {
            return;
        }
        try {
            codeJudgeGateway.queueEvaluation(new CodeJudgeEvaluationRequest(
                    submission.getSubmissionId(),
                    submission.getProblemId(),
                    problemTitle,
                    submission.getTeamId(),
                    submission.getGithubUrl(),
                    submission.getBranch(),
                    submission.getCommitSha()), ownerUserId);
        } catch (RuntimeException e) {
            // CodeJudgeGateway already swallows upstream failures; this guards the
            // caller's transaction against anything unforeseen, because nothing about
            // an optional automated evaluation may fail a submit.
            log.warn("CodeJudge hand-off unexpectedly failed for submission {} ({})",
                    submission.getSubmissionId(), e.toString());
        }
    }

    // ------------------------------------------------------- review-result push

    /**
     * Internal intake for evaluation-service's review decision
     * ({@code ACCEPTED} / {@code RETURNED}). Idempotent: a submission already at
     * the same terminal state is returned unchanged.
     */
    @Transactional
    public SubmissionView acceptReviewResult(UUID submissionId, ReviewResultPushRequest request) {
        Submission submission = requireSubmission(submissionId);
        SubmissionStatus decision;
        try {
            decision = SubmissionStatus.valueOf(request.decision());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "decision must be ACCEPTED or RETURNED");
        }
        if (decision != SubmissionStatus.ACCEPTED && decision != SubmissionStatus.RETURNED) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "decision must be ACCEPTED or RETURNED");
        }

        if (submission.getStatus() == SubmissionStatus.ACCEPTED
                || submission.getStatus() == SubmissionStatus.RETURNED) {
            return toView(submission); // duplicate push — already decided
        }
        if (submission.getStatus() != SubmissionStatus.UNDER_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Submission is not under review");
        }

        submission.setStatus(decision);
        submission.setDecisionComment(request.comment());
        submission.setDecidedAt(Instant.now());
        submissionRepository.save(submission);
        return toView(submission);
    }

    // ------------------------------------------------------------------ reads

    /** A submission the caller may act on (submitter or team member). */
    @Transactional(readOnly = true)
    public SubmissionView detail(UUID submissionId, Participant me) {
        return toView(requireActableSubmission(submissionId, me));
    }

    /** Every submission the caller may act on: individual + team-member rows. */
    @Transactional(readOnly = true)
    public List<SubmissionView> mine(Participant me) {
        List<UUID> teamIds = teamMemberRepository.findByIdParticipantId(me.getParticipantId())
                .stream().map(m -> m.getId().getTeamId()).toList();
        Map<UUID, Submission> byId = new LinkedHashMap<>();
        submissionRepository.findBySubmitterParticipantIdOrderByUpdatedAtDesc(
                        me.getParticipantId())
                .forEach(s -> byId.put(s.getSubmissionId(), s));
        submissionRepository.findByTeamIdIn(teamIds)
                .forEach(s -> byId.putIfAbsent(s.getSubmissionId(), s));
        return byId.values().stream().map(this::toView).toList();
    }

    // ------------------------------------------------------------------ helpers

    private PublishedProblem requireVisible(Participant me, UUID problemId) {
        PublishedProblem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Published problem not found"));
        if (!participantService.canSee(me, problem)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "This problem is not visible to your participant kind");
        }
        return problem;
    }

    private Participant requireParticipant(UUID participantId) {
        return participantRepository.findById(participantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Participant " + participantId + " not found"));
    }

    private Submission requireSubmission(UUID submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Submission not found"));
    }

    private Submission requireActableSubmission(UUID submissionId, Participant me) {
        Submission submission = requireSubmission(submissionId);
        requireActor(submission, me);
        return submission;
    }

    private void requireActor(Submission submission, Participant me) {
        if (submission.getSubmitterParticipantId().equals(me.getParticipantId())) {
            return;
        }
        if (submission.getTeamId() != null && teamMemberRepository
                .findByIdTeamId(submission.getTeamId()).stream()
                .anyMatch(m -> m.getId().getParticipantId().equals(me.getParticipantId()))) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN,
                "Only the submitter or a team member can act on this submission");
    }

    private void requireEditable(Submission submission) {
        if (submission.getStatus() != SubmissionStatus.DRAFT
                && submission.getStatus() != SubmissionStatus.RETURNED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Submission meta is frozen unless the status is DRAFT or RETURNED");
        }
    }

    private void requireArtifact(Submission submission, List<SubmissionFile> files) {
        boolean hasArtifact = isNotBlank(submission.getTitle())
                || isNotBlank(submission.getSummary())
                || isNotBlank(submission.getGithubUrl())
                || (submission.getLinks() != null && !submission.getLinks().isEmpty())
                || !files.isEmpty();
        if (!hasArtifact) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Add at least a title and summary, a file, or a GitHub/link before submitting");
        }
    }

    /**
     * A repo-backed submission must pin the commit it wants judged. CodeJudge refuses
     * to evaluate a moving branch HEAD — a later push must not silently change what
     * was scored — so the portal rejects the same payloads up front, with a message
     * the student can act on, instead of letting the hand-off fail later.
     *
     * <p>A file-only submission has nothing to clone, so no commit is required.</p>
     */
    private void requirePinnedCommit(Submission submission) {
        if (isBlank(submission.getGithubUrl())) {
            return;
        }
        String sha = submission.getCommitSha();
        if (isBlank(sha)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Pin the commit you want judged (commitSha is required for a GitHub submission)");
        }
        if (sha.length() < 7 || !sha.matches("[A-Za-z0-9._-]+")) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "commitSha must be 7-64 characters of [A-Za-z0-9._-]");
        }
    }

    private void applyMeta(Submission submission, String title, String summary,
                           String githubUrl, String commitSha, String branch,
                           List<java.util.Map<String, String>> links,
                           java.util.Map<String, Object> projectDetails, boolean replaceAll) {
        if (replaceAll || title != null) {
            submission.setTitle(title);
        }
        if (replaceAll || summary != null) {
            submission.setSummary(summary);
        }
        if (replaceAll || githubUrl != null) {
            submission.setGithubUrl(githubUrl);
        }
        if (replaceAll || commitSha != null) {
            // Normalise blank -> null so "no commit pinned" has one representation,
            // whatever the client happened to send.
            submission.setCommitSha(trimToNull(commitSha));
        }
        if (replaceAll || branch != null) {
            submission.setBranch(trimToNull(branch));
        }
        if (replaceAll || links != null) {
            submission.setLinks(links == null ? List.of() : links);
        }
        if (replaceAll || projectDetails != null) {
            submission.setProjectDetails(projectDetails == null ? java.util.Map.of() : projectDetails);
        }
    }

    private static List<ProjectReviewCreateRequest.ProjectFileMeta> toFileMetas(
            List<SubmissionFile> files) {
        return files.stream()
                .map(f -> new ProjectReviewCreateRequest.ProjectFileMeta(
                        f.getFileId(), f.getOriginalName(), f.getSizeBytes(), f.getContentType()))
                .toList();
    }

    private SubmissionView toView(Submission submission) {
        return new SubmissionView(
                submission.getSubmissionId(),
                submission.getProblemId(),
                submission.getTeamId(),
                submission.getTitle(),
                submission.getSummary(),
                submission.getGithubUrl(),
                submission.getCommitSha(),
                submission.getBranch(),
                submission.getLinks() == null ? List.of() : submission.getLinks(),
                submission.getStatus() == null ? null : submission.getStatus().name(),
                submission.getReviewRound(),
                submission.getReviewerUserId(),
                submission.getDecisionComment(),
                submission.getSubmittedAt(),
                submission.getDecidedAt(),
                submission.getProjectDetails() == null ? java.util.Map.of() : submission.getProjectDetails(),
                filesView(submission.getSubmissionId()),
                teamView(submission.getTeamId()));
    }

    private List<FileItemView> filesView(UUID submissionId) {
        return fileRepository.findBySubmissionIdOrderByUploadedAtAsc(submissionId).stream()
                .map(f -> new FileItemView(f.getFileId(), f.getOriginalName(),
                        f.getContentType(), f.getSizeBytes(), f.getSha256(), f.getUploadedAt()))
                .toList();
    }

    private TeamView teamView(UUID teamId) {
        if (teamId == null) {
            return null;
        }
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) {
            return null;
        }
        List<ParticipantBrief> members = teamMemberRepository.findByIdTeamId(teamId).stream()
                .map(tm -> participantRepository.findById(tm.getId().getParticipantId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(p -> new ParticipantBrief(p.getParticipantId(), p.getFullName()))
                .toList();
        return new TeamView(team.getTeamId(), team.getName(), members);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}
