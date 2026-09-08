package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {

    List<Team> findByProblemId(UUID problemId);
}
