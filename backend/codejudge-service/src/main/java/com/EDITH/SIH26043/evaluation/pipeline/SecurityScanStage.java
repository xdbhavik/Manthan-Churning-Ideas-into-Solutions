package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.evaluation.evidence.SecretHit;
import com.EDITH.SIH26043.evaluation.evidence.SecretScanService;
import com.EDITH.SIH26043.entity.SecurityFinding;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.SecurityFindingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

/**
 * SECURITY_SCANNING stage. Runs the built-in secrets/SAST scan over the workspace
 * and persists each hit as a {@code security_finding} row. The deterministic
 * scoring engine later applies the seeded policy (CRITICAL blocks, HIGH penalises
 * the Security category).
 */
@Component
public class SecurityScanStage implements Stage {

    private static final Logger log = LoggerFactory.getLogger(SecurityScanStage.class);

    private final StageMachine stageMachine;
    private final SecurityFindingRepository findingRepository;
    private final SecretScanService secretScanService;

    public SecurityScanStage(StageMachine stageMachine,
                             SecurityFindingRepository findingRepository,
                             SecretScanService secretScanService) {
        this.stageMachine = stageMachine;
        this.findingRepository = findingRepository;
        this.secretScanService = secretScanService;
    }

    @Override
    public EvaluationStatus status() {
        return EvaluationStatus.SECURITY_SCANNING;
    }

    @Override
    @Transactional
    public void execute(EvaluationContext context) {
        stageMachine.transition(context.getEvaluationId(), status(),
                "built-in secrets/SAST scan");

        if (!Files.isDirectory(context.getWorkspaceDir())) {
            throw new IllegalStateException("Workspace missing for evaluation "
                    + context.getEvaluationId());
        }

        List<SecretHit> hits = secretScanService.scan(context.getWorkspaceDir());
        findingRepository.deleteByEvaluationId(context.getEvaluationId());

        List<SecurityFinding> rows = new ArrayList<>();
        for (SecretHit hit : hits) {
            SecurityFinding row = new SecurityFinding();
            row.setEvaluationId(context.getEvaluationId());
            row.setSeverity(hit.severity());
            row.setType(hit.type());
            row.setFile(hit.file());
            row.setLine(hit.line());
            row.setMessage(hit.message());
            rows.add(row);
        }
        findingRepository.saveAll(rows);
        log.info("Evaluation {} security scan complete: {} finding(s)",
                context.getEvaluationId(), rows.size());
    }
}
