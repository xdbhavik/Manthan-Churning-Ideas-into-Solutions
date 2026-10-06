package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProjectReviewScorecard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectReviewScorecardRepository extends JpaRepository<ProjectReviewScorecard, UUID> {
}
