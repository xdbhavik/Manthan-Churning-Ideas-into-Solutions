package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationResponse;
import com.EDITH.SIH26043.entity.EvaluationResponseId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationResponseRepository extends JpaRepository<EvaluationResponse, EvaluationResponseId> {

    List<EvaluationResponse> findById_AssignmentId(UUID assignmentId);

    long countById_AssignmentId(UUID assignmentId);
}
