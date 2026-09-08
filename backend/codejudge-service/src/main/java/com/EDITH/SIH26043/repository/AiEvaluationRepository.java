package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.AiEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiEvaluationRepository extends JpaRepository<AiEvaluation, UUID> {

    Optional<AiEvaluation> findFirstByEvaluationIdOrderByCreatedAtDesc(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
