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
 * Composite key of {@link EvaluatorDomain}.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class EvaluatorDomainId implements Serializable {

    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "domain_id")
    private UUID domainId;
}
