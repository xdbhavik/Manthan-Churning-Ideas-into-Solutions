package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.EvaluatorType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluatorProfileRepository extends JpaRepository<EvaluatorProfile, UUID> {

    boolean existsByUserId(UUID userId);

    List<EvaluatorProfile> findByEvaluatorTypeAndActiveIsTrue(EvaluatorType evaluatorType);

    /** Every active profile, all pools — the project-review human fallback searches this. */
    List<EvaluatorProfile> findByActiveIsTrue();

    List<EvaluatorProfile> findByUserId(UUID userId);
}
