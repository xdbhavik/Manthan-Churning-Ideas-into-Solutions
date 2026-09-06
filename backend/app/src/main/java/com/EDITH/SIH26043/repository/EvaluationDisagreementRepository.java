package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.EvaluationDisagreement;
import com.EDITH.SIH26043.enums.DisagreementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EvaluationDisagreementRepository extends JpaRepository<EvaluationDisagreement, UUID> {

    List<EvaluationDisagreement> findByCycleId(UUID cycleId);

    List<EvaluationDisagreement> findByCycleIdAndStatus(UUID cycleId, DisagreementStatus status);

    List<EvaluationDisagreement> findByStatusOrderByCreatedAtAsc(DisagreementStatus status);
}
