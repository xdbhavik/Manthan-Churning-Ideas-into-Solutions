package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A candidate institution for {@code AUTO_SELECTED_UNIVERSITIES} routing.
 *
 * <p>{@link #name} is snapshotted into {@code problem.access_universities} and
 * later matched (normalized) against {@code participant.institution_name}, so it
 * must read like an institution's registered name.</p>
 *
 * <p>Rows are seeded by V5 and read-only here; there is no admin CRUD yet.</p>
 */
@Entity
@Table(name = "university")
@Getter
@Setter
public class University {

    @Id
    @Column(name = "university_id")
    private UUID universityId;

    @Column(name = "name", nullable = false, unique = true, length = 255)
    private String name;

    @Column(name = "short_name", length = 50)
    private String shortName;

    @Column(name = "state", length = 100)
    private String state;

    /** Soft on/off switch; only active universities are ever routed to. */
    @Column(name = "active", nullable = false)
    private boolean active = true;

    /** DB default; never written from here. */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
