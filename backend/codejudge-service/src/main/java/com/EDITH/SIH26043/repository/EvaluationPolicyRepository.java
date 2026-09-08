package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationPolicyRepository extends JpaRepository<EvaluationPolicy, String> {

    List<EvaluationPolicy> findByActiveTrue();
}
