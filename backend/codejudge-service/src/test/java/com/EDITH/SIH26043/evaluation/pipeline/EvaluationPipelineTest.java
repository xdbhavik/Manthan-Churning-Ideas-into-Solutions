package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.service.JobQueueService;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The orchestrator's contract: every run reaches a terminal state. A stage failure
 * must not escape to the worker thread (which would stop the queue draining) — it
 * becomes a FAILED evaluation plus a FAILED job row naming the stage, and the
 * later stages are skipped so no half-written score is committed.
 */
class EvaluationPipelineTest {

    private final CloneStage cloneStage = mock(CloneStage.class);
    private final ScanStage scanStage = mock(ScanStage.class);
    private final SecurityScanStage securityScanStage = mock(SecurityScanStage.class);
    private final ScoringStage scoringStage = mock(ScoringStage.class);
    private final ReportStage reportStage = mock(ReportStage.class);
    private final StageMachine stageMachine = mock(StageMachine.class);
    private final EvaluationRepository evaluationRepository = mock(EvaluationRepository.class);
    private final JobQueueService jobQueueService = mock(JobQueueService.class);
    private final CodeJudgeProperties props = new CodeJudgeProperties();

    private final EvaluationPipeline pipeline = new EvaluationPipeline(
            cloneStage, scanStage, securityScanStage, scoringStage, reportStage,
            stageMachine, evaluationRepository, jobQueueService, props);

    private final UUID evaluationId = UUID.randomUUID();
    private final UUID submissionId = UUID.randomUUID();

    @Test
    void runsTheStagesInOrderAndMarksTheJobDone() {
        stubEvaluation();
        stubStageStatuses();

        pipeline.run(evaluationId);

        var inOrder = org.mockito.Mockito.inOrder(
                cloneStage, scanStage, securityScanStage, scoringStage, reportStage);
        inOrder.verify(cloneStage).execute(org.mockito.ArgumentMatchers.any());
        inOrder.verify(scanStage).execute(org.mockito.ArgumentMatchers.any());
        inOrder.verify(securityScanStage).execute(org.mockito.ArgumentMatchers.any());
        inOrder.verify(scoringStage).execute(org.mockito.ArgumentMatchers.any());
        inOrder.verify(reportStage).execute(org.mockito.ArgumentMatchers.any());
        verify(jobQueueService).markDone(evaluationId);
        verify(jobQueueService, never()).markFailed(eq(evaluationId), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void handsTheWorkspacePathForThisEvaluationToEveryStage() {
        stubEvaluation();
        stubStageStatuses();
        var captor = org.mockito.ArgumentCaptor.forClass(EvaluationContext.class);

        pipeline.run(evaluationId);

        verify(cloneStage).execute(captor.capture());
        EvaluationContext context = captor.getValue();
        assertThat(context.getEvaluationId()).isEqualTo(evaluationId);
        assertThat(context.getSubmissionId()).isEqualTo(submissionId);
        assertThat(context.getWorkspaceDir().toString()).endsWith(evaluationId.toString());
        assertThat(context.getWorkspaceDir().isAbsolute()).isTrue();
    }

    @Test
    void aFailingStageFailsTheEvaluationAndSkipsTheRest() {
        stubEvaluation();
        stubStageStatuses();
        doThrow(new IllegalStateException("Commit abc9999 not found in repository"))
                .when(cloneStage).execute(org.mockito.ArgumentMatchers.any());

        pipeline.run(evaluationId);

        verify(stageMachine).fail(eq(evaluationId), contains("CLONING"));
        verify(jobQueueService).markFailed(eq(evaluationId), contains("Commit abc9999 not found"));
        verify(jobQueueService, never()).markDone(evaluationId);
        // Nothing downstream ran, so no partial score/report was written.
        verify(scanStage, never()).execute(org.mockito.ArgumentMatchers.any());
        verify(scoringStage, never()).execute(org.mockito.ArgumentMatchers.any());
        verify(reportStage, never()).execute(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void reportsTheDeepestCauseSoTheFailureReasonIsUseful() {
        stubEvaluation();
        stubStageStatuses();
        doThrow(new IllegalStateException("scan failed",
                new java.io.UncheckedIOException(new java.io.IOException("python3 not on PATH"))))
                .when(scanStage).execute(org.mockito.ArgumentMatchers.any());

        pipeline.run(evaluationId);

        verify(jobQueueService).markFailed(eq(evaluationId), contains("python3 not on PATH"));
    }

    @Test
    void aMissingEvaluationFailsTheJobInsteadOfThrowing() {
        when(evaluationRepository.findById(evaluationId)).thenReturn(Optional.empty());

        pipeline.run(evaluationId);

        verify(jobQueueService).markFailed(eq(evaluationId), contains("not found"));
        verify(cloneStage, never()).execute(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void aFailureWhileMarkingFailedStillRecordsTheJobFailure() {
        stubEvaluation();
        stubStageStatuses();
        doThrow(new IllegalStateException("boom")).when(scoringStage)
                .execute(org.mockito.ArgumentMatchers.any());
        when(stageMachine.fail(eq(evaluationId), org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new IllegalStateException("db gone"));

        pipeline.run(evaluationId);

        verify(jobQueueService).markFailed(eq(evaluationId), contains("SCORING"));
    }

    @Test
    void exposesTheStageOrderThisDeploymentRunsWithoutTheSandboxStages() {
        stubStageStatuses();

        assertThat(pipeline.stageOrder()).containsExactly(
                EvaluationStatus.CLONING,
                EvaluationStatus.SCANNING,
                EvaluationStatus.SECURITY_SCANNING,
                EvaluationStatus.SCORING,
                EvaluationStatus.REPORT_GENERATION);
        assertThat(pipeline.stageOrder()).doesNotContain(
                EvaluationStatus.BUILDING, EvaluationStatus.RUNNING, EvaluationStatus.TESTING);
    }

    private void stubEvaluation() {
        Evaluation evaluation = new Evaluation();
        evaluation.setEvaluationId(evaluationId);
        evaluation.setSubmissionId(submissionId);
        evaluation.setStatus(EvaluationStatus.QUEUED);
        when(evaluationRepository.findById(evaluationId)).thenReturn(Optional.of(evaluation));
    }

    private void stubStageStatuses() {
        when(cloneStage.status()).thenReturn(EvaluationStatus.CLONING);
        when(scanStage.status()).thenReturn(EvaluationStatus.SCANNING);
        when(securityScanStage.status()).thenReturn(EvaluationStatus.SECURITY_SCANNING);
        when(scoringStage.status()).thenReturn(EvaluationStatus.SCORING);
        when(reportStage.status()).thenReturn(EvaluationStatus.REPORT_GENERATION);
    }
}
