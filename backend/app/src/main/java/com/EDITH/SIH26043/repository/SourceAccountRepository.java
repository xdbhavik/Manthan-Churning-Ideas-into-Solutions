package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.SourceAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SourceAccountRepository extends JpaRepository<SourceAccount, UUID> {

    List<SourceAccount> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId);

    Optional<SourceAccount> findBySourceId(UUID sourceId);

    Optional<SourceAccount> findByRegistrationId(UUID registrationId);

    boolean existsBySourceId(UUID sourceId);
}
