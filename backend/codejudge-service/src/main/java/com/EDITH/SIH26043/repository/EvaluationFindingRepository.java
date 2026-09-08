package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationFinding;
import com.EDITH.SIH26043.enums.FindingSeverity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationFindingRepository extends JpaRepository<EvaluationFinding, UUID> {

    List<EvaluationFinding> findByEvaluationIdOrderBySeverityDescCreatedAtAsc(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
