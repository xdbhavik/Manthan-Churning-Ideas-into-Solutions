package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite key of {@link ProblemDomain}.
 * Refs: 05-data-dictionary-common.md (sec 6).
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ProblemDomainId implements Serializable {

    @Column(name = "problem_id")
    private UUID problemId;

    @Column(name = "domain_id")
    private UUID domainId;
}