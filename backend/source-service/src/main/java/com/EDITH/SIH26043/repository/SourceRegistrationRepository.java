package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SourceRegistrationRepository extends JpaRepository<SourceRegistration, UUID> {

    List<SourceRegistration> findBySubmittedByUserIdOrderByCreatedAtDesc(UUID userId);

    List<SourceRegistration> findByStatusOrderBySubmittedAtAsc(RegistrationStatus status);

    List<SourceRegistration> findByStatusInOrderBySubmittedAtAsc(Collection<RegistrationStatus> statuses);
}
