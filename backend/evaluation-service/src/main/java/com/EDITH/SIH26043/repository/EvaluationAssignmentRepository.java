package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface EvaluationAssignmentRepository extends JpaRepository<EvaluationAssignment, UUID> {

    List<EvaluationAssignment> findByCycleId(UUID cycleId);

    List<EvaluationAssignment> findByEvaluatorProfileId(UUID profileId);

    List<EvaluationAssignment> findByEvaluatorProfileIdOrderByDeadlineAsc(UUID profileId);

    List<EvaluationAssignment> findByCycleIdAndStatusIn(UUID cycleId, Collection<AssignmentStatus> statuses);

    long countByEvaluatorProfileIdAndStatusIn(UUID profileId, Collection<AssignmentStatus> statuses);
}
