package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Submission;
import com.EDITH.SIH26043.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    List<Submission> findByProblemId(UUID problemId);

    List<Submission> findBySubmitterParticipantIdOrderByUpdatedAtDesc(UUID submitterParticipantId);

    Optional<Submission> findBySubmissionIdAndSubmitterParticipantId(UUID submissionId, UUID submitterParticipantId);

    boolean existsByProblemIdAndSubmitterParticipantIdAndStatusIn(UUID problemId, UUID submitterParticipantId,
                                                                  Collection<SubmissionStatus> statuses);

    List<Submission> findByTeamId(UUID teamId);

    List<Submission> findByTeamIdIn(Collection<UUID> teamIds);

    boolean existsByProblemIdAndTeamId(UUID problemId, UUID teamId);
}
