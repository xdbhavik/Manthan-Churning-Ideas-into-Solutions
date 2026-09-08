package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProjectSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectSubmissionRepository extends JpaRepository<ProjectSubmission, UUID> {

    List<ProjectSubmission> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId);
}
