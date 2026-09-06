package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    List<RefreshToken> findByUserId(UUID userId);

    long countByUserIdAndRevokedAtIsNull(UUID userId);

    void deleteByUserId(UUID userId);

    void deleteByExpiresAtBefore(Instant cutoff);
}