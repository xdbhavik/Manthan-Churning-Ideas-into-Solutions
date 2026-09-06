package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface EvaluationCycleRepository extends JpaRepository<EvaluationCycle, UUID> {

    Optional<EvaluationCycle> findByProblemId(UUID problemId);

    boolean existsByProblemId(UUID problemId);

    Page<EvaluationCycle> findByStatusIn(Collection<EvaluationStatus> statuses, Pageable pageable);

    Page<EvaluationCycle> findByStatus(EvaluationStatus status, Pageable pageable);
}
