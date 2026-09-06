package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.OtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, UUID> {

    Optional<OtpChallenge> findTopByPhoneAndConsumedAtIsNullOrderByCreatedAtDesc(String phone);

    List<OtpChallenge> findByPhoneAndCreatedAtAfter(String phone, Instant after);

    long countByPhoneAndCreatedAtAfter(String phone, Instant after);
}