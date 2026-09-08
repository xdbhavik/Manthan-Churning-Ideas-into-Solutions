package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationCategoryRepository extends JpaRepository<EvaluationCategory, String> {

    List<EvaluationCategory> findByActiveTrueOrderBySortOrderAsc();
}
