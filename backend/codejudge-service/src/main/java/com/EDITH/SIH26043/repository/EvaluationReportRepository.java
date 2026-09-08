package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EvaluationReportRepository extends JpaRepository<EvaluationReport, UUID> {

    Optional<EvaluationReport> findByEvaluationId(UUID evaluationId);

    void deleteByEvaluationId(UUID evaluationId);
}
