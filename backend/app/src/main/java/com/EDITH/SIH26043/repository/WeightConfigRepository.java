package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.WeightConfig;
import com.EDITH.SIH26043.enums.EvaluatorType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeightConfigRepository extends JpaRepository<WeightConfig, UUID> {

    Optional<WeightConfig> findByEvaluatorType(EvaluatorType evaluatorType);

    @Override
    List<WeightConfig> findAll();
}
