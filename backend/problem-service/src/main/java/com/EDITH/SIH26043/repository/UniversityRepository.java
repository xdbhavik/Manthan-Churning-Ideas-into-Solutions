package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.University;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UniversityRepository extends JpaRepository<University, UUID> {

    /** Only active institutions are ever routed to. */
    List<University> findByUniversityIdInAndActiveIsTrue(Collection<UUID> universityIds);
}
