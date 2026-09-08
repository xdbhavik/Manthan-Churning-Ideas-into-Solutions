package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PublishedProblemRepository extends JpaRepository<PublishedProblem, UUID> {

    List<PublishedProblem> findAllByOrderByPublishedAtDesc();

    List<PublishedProblem> findByAccessRuleIn(Collection<ProblemAccessRule> accessRules);
}
