package com.EDITH.SIH26043.evaluation.pipeline;

import java.nio.file.Path;
import java.util.UUID;

/**
 * Mutable context handed to each pipeline stage for one evaluation run. Carries
 * the ids plus the resolved workspace path so stages never re-derive where a
 * submission was cloned.
 */
public class EvaluationContext {

    private final UUID evaluationId;
    private final UUID submissionId;
    private final Path workspaceDir;

    public EvaluationContext(UUID evaluationId, UUID submissionId, Path workspaceDir) {
        this.evaluationId = evaluationId;
        this.submissionId = submissionId;
        this.workspaceDir = workspaceDir;
    }

    public UUID getEvaluationId() {
        return evaluationId;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }

    public Path getWorkspaceDir() {
        return workspaceDir;
    }
}
