package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.AuditLog;
import com.EDITH.SIH26043.enums.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByProblemIdOrderByPerformedAtAsc(UUID problemId);

    Page<AuditLog> findByProblemId(UUID problemId, Pageable pageable);

    List<AuditLog> findByActionTypeAndProblemId(AuditAction action, UUID problemId);
}