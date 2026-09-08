package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.TeamRole;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Membership of a participant in a {@link Team}. The composite key is
 * {@code (team_id, participant_id)}; the leader is the participant who created
 * the team.
 */
@Entity
@Table(name = "team_member")
@Getter
@Setter
public class TeamMember {

    @EmbeddedId
    private TeamMemberId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private TeamRole role = TeamRole.MEMBER;
}
