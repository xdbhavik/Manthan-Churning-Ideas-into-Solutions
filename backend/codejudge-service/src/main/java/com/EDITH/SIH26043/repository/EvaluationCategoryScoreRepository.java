package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationCategoryScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationCategoryScoreRepository extends JpaRepository<EvaluationCategoryScore, UUID> {

    List<EvaluationCategoryScore> findByEvaluationIdOrderByCategoryKeyAsc(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
