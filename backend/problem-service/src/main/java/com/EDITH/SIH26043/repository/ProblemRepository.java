package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.ProblemStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProblemRepository extends JpaRepository<Problem, UUID> {

    List<Problem> findBySubmittedByUserId(UUID userId);

    Page<Problem> findBySubmittedByUserId(UUID userId, Pageable pageable);

    long countByStatus(ProblemStatus status);

    long countBySourceId(UUID sourceId);
}