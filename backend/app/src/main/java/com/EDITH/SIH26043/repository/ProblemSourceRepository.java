package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProblemSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProblemSourceRepository extends JpaRepository<ProblemSource, UUID> {
}