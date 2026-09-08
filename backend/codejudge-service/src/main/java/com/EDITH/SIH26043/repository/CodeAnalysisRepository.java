package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.CodeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CodeAnalysisRepository extends JpaRepository<CodeAnalysis, UUID> {

    List<CodeAnalysis> findByEvaluationId(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
