package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.ProjectSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectSubmissionRepository extends JpaRepository<ProjectSubmission, UUID> {

    List<ProjectSubmission> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId);

    /**
     * The hand-off idempotency key: one portal submission judged at one commit is
     * one evaluation request, however many times the caller retries the push.
     */
    Optional<ProjectSubmission> findFirstByPortalSubmissionIdAndCommitSha(
            UUID portalSubmissionId, String commitSha);
}
