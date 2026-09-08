package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {

    List<Evaluation> findBySubmissionIdOrderByCreatedAtDesc(UUID submissionId);

    List<Evaluation> findByStatusOrderByCreatedAtDesc(EvaluationStatus status);
}
