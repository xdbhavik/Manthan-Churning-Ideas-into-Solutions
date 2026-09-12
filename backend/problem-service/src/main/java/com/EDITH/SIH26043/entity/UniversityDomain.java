package com.EDITH.SIH26043.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Junction between {@link University} and {@link Domain}: the areas an
 * institution can be routed a problem in.
 *
 * <p>Only level-1 root domains are tagged (see V5__university_catalog.sql), so
 * matching a problem's domains is a flat set intersection with no hierarchy
 * walk.</p>
 */
@Entity
@Table(name = "university_domain")
@Getter
@Setter
public class UniversityDomain {

    @EmbeddedId
    private UniversityDomainId id;
}
