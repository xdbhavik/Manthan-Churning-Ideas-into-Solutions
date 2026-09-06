package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.ProblemAnalysis;
import com.EDITH.SIH26043.enums.AnalysisStatus;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.service.analysis.AnalysisResult;
import com.EDITH.SIH26043.service.analysis.HeuristicAnalysisFallback;
import com.EDITH.SIH26043.service.analysis.ProblemAnalysisClient;
import com.EDITH.SIH26043.service.analysis.ProblemContext;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Phase 2 analysis step (S3): the LLM profile is persisted when Claude answers,
 * the deterministic heuristic is persisted when it does not, and either way the
 * cycle advances to ROUTING so the pipeline never blocks on the network.
 */
class ProblemAnalysisServiceTest {

    private final EvaluationCycleRepository cycleRepository = mock(EvaluationCycleRepository.class);
    private final ProblemRepository problemRepository = mock(ProblemRepository.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);
    private final ProblemDomainRepository problemDomainRepository = mock(ProblemDomainRepository.class);
    private final DomainRepository domainRepository = mock(DomainRepository.class);
    private final EvidenceRepository evidenceRepository = mock(EvidenceRepository.class);
    private final ProblemAnalysisRepository analysisRepository = mock(ProblemAnalysisRepository.class);
    private final EvaluationStatusService statusService = mock(EvaluationStatusService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final ProblemAnalysisClient analysisClient = mock(ProblemAnalysisClient.class);
    private final HeuristicAnalysisFallback fallback = mock(HeuristicAnalysisFallback.class);

    private final ProblemAnalysisService service = new ProblemAnalysisService(
            cycleRepository, problemRepository, locationRepository, problemDomainRepository,
            domainRepository, evidenceRepository, analysisRepository, statusService,
            auditService, analysisClient, fallback);

    private final UUID actor = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID problemId = UUID.randomUUID();

    @Test
    void unknownCycleIsNotFound() {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.analyze(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void analysisIsRejectedFromAnUnrelatedStatus() {
        givenCycle(EvaluationStatus.PRIORITIZED);

        assertThatThrownBy(() -> service.analyze(cycleId, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("analysis can only run from")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(analysisRepository, never()).save(any());
    }

    @Test
    void llmSuccessIsPersistedAndCycleAdvancesToRouting() {
        givenCycle(EvaluationStatus.RECEIVED);
        givenProblem();
        when(analysisClient.analyze(any(ProblemContext.class))).thenReturn(Optional.of(claudeResult()));
        when(analysisRepository.findByCycleId(cycleId)).thenReturn(Optional.empty());

        ProblemAnalysis row = service.analyze(cycleId, actor, "127.0.0.1");

        assertThat(row.getCycleId()).isEqualTo(cycleId);
        assertThat(row.getProvider()).isEqualTo("claude");
        assertThat(row.getModel()).isEqualTo("claude-opus-5");
        assertThat(row.getProblemCategory()).isEqualTo("WATER_SUPPLY");
        assertThat(row.getImpactAreas()).containsExactly("HEALTH", "LIVELIHOOD");
        assertThat(row.getStatus()).isEqualTo(AnalysisStatus.SUCCESS);
        assertThat(row.getLatencyMs()).isNotNull();
        assertThat(row.getAnalyzedAt()).isNotNull();
        // aiSummary has no column of its own; it rides along in rawPayload.
        assertThat(row.getRawPayload()).containsEntry("aiSummary", "Aging pipeline, high public impact.");

        verify(analysisRepository).save(row);
        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.ROUTING), eq(actor),
                org.mockito.ArgumentMatchers.contains("claude"));
        verify(auditService).record(eq(problemId), eq(AuditAction.EVALUATION_ANALYZED), eq(actor),
                isNull(), anyMap(), eq("127.0.0.1"));
        // Claude answered, so the deterministic classifier is never consulted.
        verify(fallback, never()).analyze(any());
    }

    @Test
    void llmUnavailableFallsBackToHeuristicAndStillAdvances() {
        givenCycle(EvaluationStatus.RECEIVED);
        givenProblem();
        when(analysisClient.analyze(any(ProblemContext.class))).thenReturn(Optional.empty());
        when(fallback.analyze(any(ProblemContext.class))).thenReturn(heuristicResult());
        when(analysisRepository.findByCycleId(cycleId)).thenReturn(Optional.empty());

        ProblemAnalysis row = service.analyze(cycleId, actor, "127.0.0.1");

        assertThat(row.getProvider()).isEqualTo("heuristic");
        assertThat(row.getStatus()).isEqualTo(AnalysisStatus.HEURISTIC_FALLBACK);
        assertThat(row.getErrorMessage()).contains("unavailable");

        verify(statusService).transition(eq(cycleId), eq(EvaluationStatus.ROUTING), eq(actor),
                org.mockito.ArgumentMatchers.contains("heuristic"));
    }

    @Test
    void rerunReplacesTheExistingProfileInsteadOfInsertingASecond() {
        givenCycle(EvaluationStatus.ANALYZING);
        givenProblem();
        ProblemAnalysis existing = new ProblemAnalysis();
        existing.setAnalysisId(UUID.randomUUID());
        existing.setCycleId(cycleId);
        existing.setProvider("heuristic");
        when(analysisRepository.findByCycleId(cycleId)).thenReturn(Optional.of(existing));
        when(analysisClient.analyze(any(ProblemContext.class))).thenReturn(Optional.of(claudeResult()));

        ProblemAnalysis row = service.analyze(cycleId, actor, "127.0.0.1");

        assertThat(row).isSameAs(existing);
        assertThat(row.getProvider()).isEqualTo("claude");
        // The cycle was already ANALYZING, so no redundant entry transition fired.
        verify(statusService, never()).transition(eq(cycleId), eq(EvaluationStatus.ANALYZING),
                any(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void failedAnalysisRetryReentersAnalyzing() {
        givenCycle(EvaluationStatus.ANALYSIS_FAILED);
        givenProblem();
        when(analysisClient.analyze(any(ProblemContext.class))).thenReturn(Optional.of(claudeResult()));
        when(analysisRepository.findByCycleId(cycleId)).thenReturn(Optional.empty());

        service.analyze(cycleId, actor, "127.0.0.1");

        ArgumentCaptor<EvaluationStatus> targets = ArgumentCaptor.forClass(EvaluationStatus.class);
        verify(statusService, org.mockito.Mockito.times(2))
                .transition(eq(cycleId), targets.capture(), eq(actor), org.mockito.ArgumentMatchers.anyString());
        assertThat(targets.getAllValues())
                .containsExactly(EvaluationStatus.ANALYZING, EvaluationStatus.ROUTING);
    }

    private void givenCycle(EvaluationStatus status) {
        EvaluationCycle cycle = new EvaluationCycle();
        cycle.setCycleId(cycleId);
        cycle.setProblemId(problemId);
        cycle.setStatus(status);
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
    }

    private void givenProblem() {
        Problem problem = new Problem();
        problem.setProblemId(problemId);
        problem.setTitle("Irregular drinking water supply");
        problem.setDescription("Hand pumps dry during summer.");
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
        when(problemDomainRepository.findByIdProblemId(problemId)).thenReturn(List.of());
        when(evidenceRepository.findByProblemId(problemId)).thenReturn(List.of());
    }

    private static AnalysisResult claudeResult() {
        return new AnalysisResult("WATER_SUPPLY", "Water & Sanitation", "WATER",
                List.of("HEALTH", "LIVELIHOOD"), "HIGH", "REGIONAL", "MEDIUM", "HIGH",
                "Aging pipeline, high public impact.", "claude", "claude-opus-5",
                AnalysisStatus.SUCCESS, Map.of("problemCategory", "WATER_SUPPLY"), null);
    }

    private static AnalysisResult heuristicResult() {
        return new AnalysisResult("WATER_SUPPLY", "Water & Sanitation", "WATER",
                List.of("HEALTH"), "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM",
                "Heuristic profile.", "heuristic", "heuristic",
                AnalysisStatus.HEURISTIC_FALLBACK, Map.of(),
                "Claude analysis unavailable; deterministic fallback applied");
    }
}
