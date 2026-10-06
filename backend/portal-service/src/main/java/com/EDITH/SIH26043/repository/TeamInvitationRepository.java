package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.TeamInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, UUID> {
    List<TeamInvitation> findByInviteeParticipantIdOrInviterParticipantIdOrderByCreatedAtDesc(UUID inviteeId, UUID inviterId);
    Optional<TeamInvitation> findByTeamIdAndInviteeParticipantId(UUID teamId, UUID inviteeId);
}
