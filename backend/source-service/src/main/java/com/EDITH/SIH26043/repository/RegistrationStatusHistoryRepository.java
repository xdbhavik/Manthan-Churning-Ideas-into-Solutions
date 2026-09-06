package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.RegistrationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegistrationStatusHistoryRepository extends JpaRepository<RegistrationStatusHistory, UUID> {

    List<RegistrationStatusHistory> findByRegistrationIdOrderByChangedAtAsc(UUID registrationId);
}
