package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {

    Optional<Participant> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
}
