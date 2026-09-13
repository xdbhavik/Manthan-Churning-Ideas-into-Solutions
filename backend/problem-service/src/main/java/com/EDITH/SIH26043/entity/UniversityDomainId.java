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
 * Composite key of {@link UniversityDomain}.
 * Mirrors {@link ProblemDomainId}.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UniversityDomainId implements Serializable {

    @Column(name = "university_id")
    private UUID universityId;

    @Column(name = "domain_id")
    private UUID domainId;
}
