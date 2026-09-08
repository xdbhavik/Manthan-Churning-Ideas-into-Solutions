package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationJob;
import com.EDITH.SIH26043.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, UUID> {

    Optional<EvaluationJob> findByEvaluationId(UUID evaluationId);

    List<EvaluationJob> findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus status);

    void deleteByEvaluationId(UUID evaluationId);
}
