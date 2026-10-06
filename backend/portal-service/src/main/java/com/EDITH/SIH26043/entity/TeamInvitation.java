package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.TeamInvitationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "team_invitation", uniqueConstraints =
        @UniqueConstraint(name = "uk_team_invitation_team_invitee", columnNames = {"team_id", "invitee_participant_id"}))
@Getter
@Setter
public class TeamInvitation {
    @Id
    @Column(name = "invitation_id")
    private UUID invitationId;

    @Column(name = "team_id", nullable = false)
    private UUID teamId;

    @Column(name = "inviter_participant_id", nullable = false)
    private UUID inviterParticipantId;

    @Column(name = "invitee_participant_id", nullable = false)
    private UUID inviteeParticipantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TeamInvitationStatus status = TeamInvitationStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @PrePersist
    void onCreate() {
        if (invitationId == null) invitationId = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
