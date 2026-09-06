package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProblemDomain;
import com.EDITH.SIH26043.entity.ProblemDomainId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProblemDomainRepository extends JpaRepository<ProblemDomain, ProblemDomainId> {

    List<ProblemDomain> findByIdProblemId(UUID problemId);

    void deleteByIdProblemId(UUID problemId);
}