package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.SubmissionFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, UUID> {

    List<SubmissionFile> findBySubmissionIdOrderByUploadedAtAsc(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
