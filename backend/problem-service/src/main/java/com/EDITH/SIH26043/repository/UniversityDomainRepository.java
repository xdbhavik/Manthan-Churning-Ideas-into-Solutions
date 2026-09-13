package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.UniversityDomain;
import com.EDITH.SIH26043.entity.UniversityDomainId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UniversityDomainRepository extends JpaRepository<UniversityDomain, UniversityDomainId> {

    /** The institution ids tagged with any of the given (level-1 root) domains. */
    List<UniversityDomain> findByIdDomainIdIn(Collection<UUID> domainIds);
}
