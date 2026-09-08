package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.SecurityFinding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SecurityFindingRepository extends JpaRepository<SecurityFinding, UUID> {

    List<SecurityFinding> findByEvaluationIdOrderBySeverityAsc(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
