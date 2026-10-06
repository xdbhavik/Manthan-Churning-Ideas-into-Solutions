package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.service.JobQueueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

/**
 * The evaluation orchestrator. Runs the ordered stages for one evaluation, each
 * in its own transaction, and guarantees a terminal state: COMPLETED when the
 * report stage finishes, FAILED (with the failing stage + reason) otherwise.
 *
 * <p>Stage order in this deployment:
 * {@code CLONING → SCANNING → SECURITY_SCANNING → SCORING →
 * REPORT_GENERATION → COMPLETED}. The sandboxed BUILDING/RUNNING/TESTING stages
 * are deliberately absent while {@code app.codejudge.sandbox-enabled=false} — the
 * categories they would feed are reported {@code NOT_EVALUATED} rather than
 * guessed, and no submitted code is ever executed.</p>
 */
@Component
public class EvaluationPipeline {

    private static final Logger log = LoggerFactory.getLogger(EvaluationPipeline.class);

    private final List<Stage> stages;
    private final StageMachine stageMachine;
    private final EvaluationRepository evaluationRepository;
    private final JobQueueService jobQueueService;
    private final CodeJudgeProperties props;

    public EvaluationPipeline(CloneStage cloneStage,
                              ScanStage scanStage,
                              SecurityScanStage securityScanStage,
                              ScoringStage scoringStage,
                              ReportStage reportStage,
                              StageMachine stageMachine,
                              EvaluationRepository evaluationRepository,
                              JobQueueService jobQueueService,
                              CodeJudgeProperties props) {
        this.stages = List.of(cloneStage, scanStage, securityScanStage, scoringStage, reportStage);
        this.stageMachine = stageMachine;
        this.evaluationRepository = evaluationRepository;
        this.jobQueueService = jobQueueService;
        this.props = props;
    }

    /**
     * Execute the whole pipeline for one evaluation. Never throws: a stage failure
     * is converted into a FAILED evaluation plus a FAILED job row carrying the
     * reason, so the worker loop keeps draining the queue.
     */
    public void run(UUID evaluationId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId).orElse(null);
        if (evaluation == null) {
            log.warn("Job referenced missing evaluation {}", evaluationId);
            jobQueueService.markFailed(evaluationId, "Evaluation row not found");
            return;
        }
        EvaluationContext context = new EvaluationContext(
                evaluationId, evaluation.getSubmissionId(), workspaceFor(evaluationId));

        Stage current = null;
        try {
            for (Stage stage : stages) {
                current = stage;
                stage.execute(context);
            }
            jobQueueService.markDone(evaluationId);
            log.info("Evaluation {} completed", evaluationId);
        } catch (RuntimeException e) {
            String stageName = current == null ? "PIPELINE" : current.status().name();
            String reason = stageName + ": " + rootMessage(e);
            log.error("Evaluation {} failed in {}", evaluationId, stageName, e);
            safeFail(evaluationId, reason);
            jobQueueService.markFailed(evaluationId, reason);
        }
    }

    /** One workspace directory per evaluation under the configured workspaces root. */
    public Path workspaceFor(UUID evaluationId) {
        return Paths.get(props.getWorkspacesDir()).resolve(evaluationId.toString()).toAbsolutePath();
    }

    private void safeFail(UUID evaluationId, String reason) {
        try {
            stageMachine.fail(evaluationId, reason);
        } catch (RuntimeException e) {
            // The evaluation may be unreachable (deleted mid-run); the job row still
            // records the failure, so never let this mask the original error.
            log.error("Could not mark evaluation {} FAILED", evaluationId, e);
        }
    }

    /** Deepest cause message — stage errors are usually wrapped once or twice. */
    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        String message = cause.getMessage();
        return message == null || message.isBlank() ? cause.getClass().getSimpleName() : message;
    }

    /** Exposed for the admin/read model: the stage list this deployment runs. */
    public List<EvaluationStatus> stageOrder() {
        return stages.stream().map(Stage::status).toList();
    }
}
