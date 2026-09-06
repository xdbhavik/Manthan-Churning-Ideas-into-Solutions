package com.EDITH.SIH26043.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Problem classification taxonomy (max depth 3, self-referential).
 * Refs: 05-data-dictionary-common.md (sec 5, 12).
 */
@Entity
@Table(name = "domain")
@Getter
@Setter
public class Domain {

    @Id
    @Column(name = "domain_id")
    private UUID domainId;

    @Column(name = "domain_name", nullable = false, unique = true, length = 100)
    private String domainName;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    /**
     * Not serialized: the tree response nests children, so emitting the parent
     * too makes the graph cyclic and overruns Jackson's nesting depth limit.
     */
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "parent_domain_id")
    private Domain parentDomain;

    /** 1 = primary/root, 2 = secondary, 3 = tertiary. */
    @Column(name = "level", nullable = false)
    private Integer level = 1;

    /** Populated by the API layer for tree responses; not a persisted column. */
    @jakarta.persistence.Transient
    private java.util.List<Domain> children = new java.util.ArrayList<>();

    @PrePersist
    void onCreate() {
        if (domainId == null) {
            domainId = UUID.randomUUID();
        }
        if (level == null) {
            level = parentDomain == null ? 1 : parentDomain.getLevel() + 1;
        }
    }
}