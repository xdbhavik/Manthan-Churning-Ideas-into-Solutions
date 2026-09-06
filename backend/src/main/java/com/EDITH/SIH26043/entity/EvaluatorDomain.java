package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Junction between {@link EvaluatorProfile} and {@link Domain}: the domains an
 * evaluator claims expertise in. Mirrors the {@code problem_domain} pattern.
 */
@Entity
@Table(name = "evaluator_domain")
@Getter
@Setter
public class EvaluatorDomain {

    @EmbeddedId
    private EvaluatorDomainId id;
}
