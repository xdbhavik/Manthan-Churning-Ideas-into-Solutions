package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.SourceVerification;
import com.EDITH.SIH26043.enums.VerificationResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SourceVerificationRepository extends JpaRepository<SourceVerification, UUID> {

    List<SourceVerification> findBySourceIdOrderByVerifiedAtDesc(UUID sourceId);

    List<SourceVerification> findBySourceIdAndResult(UUID sourceId, VerificationResult result);
}