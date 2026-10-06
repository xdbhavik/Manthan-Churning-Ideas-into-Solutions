package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.ParticipantService;
import com.EDITH.SIH26043.service.TeamService;
import com.EDITH.SIH26043.web.dto.TeamCreateRequest;
import com.EDITH.SIH26043.web.dto.TeamInvitationView;
import com.EDITH.SIH26043.web.dto.TeamOverview;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/portal/teams")
public class TeamController {
    private final ParticipantService participants;
    private final TeamService teams;

    public TeamController(ParticipantService participants, TeamService teams) {
        this.participants = participants;
        this.teams = teams;
    }

    @GetMapping
    public List<TeamOverview> mine(@AuthenticationPrincipal AuthUser me) {
        return teams.mine(participants.me(me));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamOverview create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody TeamCreateRequest request) {
        return teams.create(participants.me(me), request);
    }

    @GetMapping("/invitations")
    public List<TeamInvitationView> invitations(@AuthenticationPrincipal AuthUser me) {
        return teams.invitations(participants.me(me));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public TeamInvitationView accept(@AuthenticationPrincipal AuthUser me, @PathVariable UUID invitationId) {
        return teams.respond(participants.me(me), invitationId, true);
    }

    @PostMapping("/invitations/{invitationId}/decline")
    public TeamInvitationView decline(@AuthenticationPrincipal AuthUser me, @PathVariable UUID invitationId) {
        return teams.respond(participants.me(me), invitationId, false);
    }
}
