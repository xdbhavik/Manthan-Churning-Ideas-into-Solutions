package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluatorDomain;
import com.EDITH.SIH26043.entity.EvaluatorDomainId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EvaluatorDomainRepository extends JpaRepository<EvaluatorDomain, EvaluatorDomainId> {

    List<EvaluatorDomain> findByIdProfileId(UUID profileId);

    @Query("select ed.id.domainId from EvaluatorDomain ed where ed.id.profileId in :profileIds")
    List<UUID> findDomainIdsByProfileIds(@Param("profileIds") List<UUID> profileIds);
}
