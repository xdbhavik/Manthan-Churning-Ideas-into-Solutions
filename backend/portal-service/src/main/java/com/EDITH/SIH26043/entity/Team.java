package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A group of participants solving one published problem. Students may also solve
 * individually (no team row); restricted problems are university-led, so the
 * team's creator is always the submitting participant.
 */
@Entity
@Table(name = "team")
@Getter
@Setter
public class Team {

    @Id
    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "created_by_participant_id", nullable = false)
    private UUID createdByParticipantId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (teamId == null) {
            teamId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
