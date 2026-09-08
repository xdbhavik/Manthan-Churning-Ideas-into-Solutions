package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.TeamMember;
import com.EDITH.SIH26043.entity.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    List<TeamMember> findByIdTeamId(UUID teamId);

    List<TeamMember> findByIdParticipantId(UUID participantId);

    void deleteByIdTeamId(UUID teamId);
}
