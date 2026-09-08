package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProjectReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectReviewRepository extends JpaRepository<ProjectReview, UUID> {

    Optional<ProjectReview> findBySubmissionIdAndRound(UUID submissionId, int round);

    List<ProjectReview> findByEvaluatorProfileIdOrderByCreatedAtDesc(UUID evaluatorProfileId);
}
