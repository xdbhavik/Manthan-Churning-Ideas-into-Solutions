package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Junction between {@link Problem} and {@link Domain}. Exactly one primary
 * domain per problem is enforced by a partial unique index (doc 05, sec 6).
 */
@Entity
@Table(name = "problem_domain")
@Getter
@Setter
public class ProblemDomain {

    @EmbeddedId
    private ProblemDomainId id;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;
}