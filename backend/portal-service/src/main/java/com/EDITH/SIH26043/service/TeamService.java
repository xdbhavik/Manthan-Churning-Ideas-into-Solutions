package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.entity.Team;
import com.EDITH.SIH26043.entity.TeamInvitation;
import com.EDITH.SIH26043.entity.TeamMember;
import com.EDITH.SIH26043.entity.TeamMemberId;
import com.EDITH.SIH26043.enums.TeamInvitationStatus;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.TeamRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.repository.TeamInvitationRepository;
import com.EDITH.SIH26043.repository.TeamMemberRepository;
import com.EDITH.SIH26043.repository.TeamRepository;
import com.EDITH.SIH26043.web.dto.ParticipantBrief;
import com.EDITH.SIH26043.web.dto.TeamCreateRequest;
import com.EDITH.SIH26043.web.dto.TeamInvitationView;
import com.EDITH.SIH26043.web.dto.TeamOverview;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TeamService {
    private final TeamRepository teams;
    private final TeamMemberRepository members;
    private final TeamInvitationRepository invitations;
    private final ParticipantRepository participants;
    private final PublishedProblemRepository problems;
    private final ParticipantService participantService;

    public TeamService(TeamRepository teams, TeamMemberRepository members,
                       TeamInvitationRepository invitations, ParticipantRepository participants,
                       PublishedProblemRepository problems, ParticipantService participantService) {
        this.teams = teams;
        this.members = members;
        this.invitations = invitations;
        this.participants = participants;
        this.problems = problems;
        this.participantService = participantService;
    }

    @Transactional
    public TeamOverview create(Participant leader, TeamCreateRequest request) {
        PublishedProblem problem = problems.findById(request.problemId())
                .filter(p -> participantService.canSee(leader, p))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found or not visible"));
        Team team = new Team();
        team.setProblemId(problem.getProblemId());
        team.setName(request.name().trim());
        team.setCreatedByParticipantId(leader.getParticipantId());
        teams.save(team);
        members.save(member(team.getTeamId(), leader, TeamRole.LEADER));
        if (request.inviteeParticipantIds() != null) {
            for (UUID id : request.inviteeParticipantIds().stream().distinct().toList()) {
                if (id.equals(leader.getParticipantId())) continue;
                Participant invitee = participants.findById(id)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Registered student not found"));
                if (invitee.getParticipantType() != ParticipantType.STUDENT)
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Only registered student participants can be invited");
                if (!participantService.canSee(invitee, problem)) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Invitee cannot access this problem");
                }
                invitations.save(newInvitation(team, leader, invitee));
            }
        }
        return overview(team, leader);
    }

    @Transactional(readOnly = true)
    public List<TeamOverview> mine(Participant me) {
        return members.findByIdParticipantId(me.getParticipantId()).stream()
                .map(tm -> teams.findById(tm.getId().getTeamId()).orElse(null))
                .filter(t -> t != null).map(t -> overview(t, me)).toList();
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationView> invitations(Participant me) {
        return invitations.findByInviteeParticipantIdOrInviterParticipantIdOrderByCreatedAtDesc(
                        me.getParticipantId(), me.getParticipantId()).stream()
                .map(i -> invitationView(i, me)).toList();
    }

    @Transactional
    public TeamInvitationView respond(Participant me, UUID invitationId, boolean accept) {
        TeamInvitation invite = invitations.findById(invitationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invitation not found"));
        if (!invite.getInviteeParticipantId().equals(me.getParticipantId()))
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the invited student can respond");
        if (invite.getStatus() != TeamInvitationStatus.PENDING)
            throw new ApiException(HttpStatus.CONFLICT, "Invitation has already been answered");
        Team team = teams.findById(invite.getTeamId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (accept) {
            PublishedProblem problem = problems.findById(team.getProblemId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found"));
            if (!participantService.canSee(me, problem))
                throw new ApiException(HttpStatus.FORBIDDEN, "You cannot access this problem");
            if (!members.existsById(new TeamMemberId(team.getTeamId(), me.getParticipantId())))
                members.save(member(team.getTeamId(), me, TeamRole.MEMBER));
            invite.setStatus(TeamInvitationStatus.ACCEPTED);
        } else invite.setStatus(TeamInvitationStatus.DECLINED);
        invite.setRespondedAt(Instant.now());
        invitations.save(invite);
        return invitationView(invite, me);
    }

    public void requireTeamMember(UUID teamId, Participant me) {
        if (!members.existsById(new TeamMemberId(teamId, me.getParticipantId())))
            throw new ApiException(HttpStatus.FORBIDDEN, "You must accept a team invitation to join this team");
    }

    private TeamOverview overview(Team t, Participant me) {
        PublishedProblem p = problems.findById(t.getProblemId()).orElse(null);
        List<ParticipantBrief> people = members.findByIdTeamId(t.getTeamId()).stream()
                .map(m -> participants.findById(m.getId().getParticipantId()).orElse(null))
                .filter(x -> x != null).map(x -> new ParticipantBrief(x.getParticipantId(), x.getFullName())).toList();
        String role = t.getCreatedByParticipantId().equals(me.getParticipantId()) ? "LEADER" : "MEMBER";
        return new TeamOverview(t.getTeamId(), t.getName(), t.getProblemId(), p == null ? "" : p.getTitle(), role, t.getCreatedAt(), people);
    }

    private TeamInvitationView invitationView(TeamInvitation i, Participant me) {
        Team t = teams.findById(i.getTeamId()).orElse(null);
        PublishedProblem p = t == null ? null : problems.findById(t.getProblemId()).orElse(null);
        Participant from = participants.findById(i.getInviterParticipantId()).orElse(null);
        Participant to = participants.findById(i.getInviteeParticipantId()).orElse(null);
        return new TeamInvitationView(i.getInvitationId(), i.getTeamId(), t == null ? "" : t.getName(),
                t == null ? null : t.getProblemId(), p == null ? "" : p.getTitle(),
                from == null ? "" : from.getFullName(), to == null ? "" : to.getFullName(),
                i.getStatus().name(), i.getInviteeParticipantId().equals(me.getParticipantId()) ? "RECEIVED" : "SENT",
                i.getCreatedAt(), i.getRespondedAt());
    }

    private TeamMember member(UUID teamId, Participant p, TeamRole role) {
        TeamMember m = new TeamMember(); m.setId(new TeamMemberId(teamId, p.getParticipantId())); m.setRole(role); return m;
    }

    private TeamInvitation newInvitation(Team team, Participant from, Participant to) {
        TeamInvitation i = new TeamInvitation(); i.setTeamId(team.getTeamId());
        i.setInviterParticipantId(from.getParticipantId()); i.setInviteeParticipantId(to.getParticipantId());
        i.setStatus(TeamInvitationStatus.PENDING); return i;
    }
}
