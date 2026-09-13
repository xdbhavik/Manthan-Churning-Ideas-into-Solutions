package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.ProblemContextGateway;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.ProblemAnalysis;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.ProblemAnalysisRepository;
import com.EDITH.SIH26043.service.analysis.AnalysisResult;
import com.EDITH.SIH26043.service.analysis.HeuristicAnalysisFallback;
import com.EDITH.SIH26043.service.analysis.ProblemAnalysisClient;
import com.EDITH.SIH26043.service.analysis.ProblemContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Phase 2 analysis step: fetches the problem context from problem-service,
 * runs the LLM client (falling back to the deterministic heuristic when the
 * model is unavailable), persists the {@link ProblemAnalysis} row and advances
 * the cycle to ROUTING.
 */
@Service
public class ProblemAnalysisService {

    private final EvaluationCycleRepository cycleRepository;
    private final ProblemAnalysisRepository analysisRepository;
    private final EvaluationStatusService statusService;
    private final AuditService auditService;
    private final ProblemAnalysisClient analysisClient;
    private final HeuristicAnalysisFallback fallback;
    private final ProblemContextGateway problemGateway;

    public ProblemAnalysisService(EvaluationCycleRepository cycleRepository,
                                  ProblemAnalysisRepository analysisRepository,
                                  EvaluationStatusService statusService,
                                  AuditService auditService,
                                  ProblemAnalysisClient analysisClient,
                                  HeuristicAnalysisFallback fallback,
                                  ProblemContextGateway problemGateway) {
        this.cycleRepository = cycleRepository;
        this.analysisRepository = analysisRepository;
        this.statusService = statusService;
        this.auditService = auditService;
        this.analysisClient = analysisClient;
        this.fallback = fallback;
        this.problemGateway = problemGateway;
    }

    @Transactional
    public ProblemAnalysis analyze(UUID cycleId, UUID actorUserId, String ipAddress) {
        EvaluationCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));

        prepareForAnalysis(cycle, actorUserId);

        // The context is assembled upstream (problem + location + domain names +
        // evidence count) and fetched over the internal API.
        ProblemContext context = ProblemContext.from(problemGateway.fetch(cycle.getProblemId()));

        long startedNanos = System.nanoTime();
        Optional<AnalysisResult> llmResult = analysisClient.analyze(context);
        long latencyMs = (System.nanoTime() - startedNanos) / 1_000_000;
        AnalysisResult result = llmResult.orElseGet(() -> fallback.analyze(context));

        ProblemAnalysis row = analysisRepository.findByCycleId(cycleId)
                .orElseGet(ProblemAnalysis::new);
        map(result, row, cycleId, latencyMs);
        analysisRepository.save(row);

        // The fallback always yields a usable profile, so analysis completes to
        // ROUTING in practice; ANALYSIS_FAILED stays reachable for a total outage.
        statusService.transition(cycleId, EvaluationStatus.ROUTING, actorUserId,
                "Problem analysis completed by " + result.provider() + "/" + result.model());
        auditService.record("PROBLEM", context.problemId(), AuditAction.EVALUATION_ANALYZED,
                actorUserId, null, snapshot(row), ipAddress);
        return row;
    }

    private void prepareForAnalysis(EvaluationCycle cycle, UUID actorUserId) {
        EvaluationStatus current = cycle.getStatus();
        if (current == EvaluationStatus.RECEIVED) {
            statusService.transition(cycle.getCycleId(), EvaluationStatus.ANALYZING,
                    actorUserId, "Analysis step started");
        } else if (current == EvaluationStatus.ANALYSIS_FAILED) {
            statusService.transition(cycle.getCycleId(), EvaluationStatus.ANALYZING,
                    actorUserId, "Analysis retried after failure");
        } else if (current != EvaluationStatus.ANALYZING) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cycle " + cycle.getCycleId() + " is " + current
                            + "; analysis can only run from RECEIVED/ANALYZING/ANALYSIS_FAILED");
        }
    }

    private void map(AnalysisResult result, ProblemAnalysis row, UUID cycleId, long latencyMs) {
        row.setCycleId(cycleId);
        row.setProvider(result.provider());
        row.setModel(result.model());
        row.setProblemCategory(result.problemCategory());
        row.setDomain(result.domain());
        row.setSector(result.sector());
        row.setImpactAreas(result.impactAreas() == null ? List.of() : result.impactAreas());
        row.setComplexity(result.complexity());
        row.setPotentialScale(result.potentialScale());
        row.setTechnologyRelevance(result.technologyRelevance());
        row.setSocialImpact(result.socialImpact());
        row.setStatus(result.status());
        row.setErrorMessage(result.errorMessage());
        row.setLatencyMs(latencyMs);
        row.setModelVersion(result.model());
        // Set explicitly: @PrePersist only fires on insert, and a re-run must not
        // keep the timestamp of the profile it replaced.
        row.setAnalyzedAt(java.time.Instant.now());
        Map<String, Object> raw = result.rawPayload() == null ? Map.of() : result.rawPayload();
        if (result.aiSummary() != null) {
            // aiSummary has no dedicated column; it is kept in the audit payload.
            java.util.HashMap<String, Object> enriched = new java.util.HashMap<>(raw);
            enriched.put("aiSummary", result.aiSummary());
            raw = enriched;
        }
        row.setRawPayload(raw);
    }

    private Map<String, Object> snapshot(ProblemAnalysis row) {
        java.util.HashMap<String, Object> snap = new java.util.HashMap<>();
        snap.put("analysisId", row.getAnalysisId());
        snap.put("cycleId", row.getCycleId());
        snap.put("provider", row.getProvider());
        snap.put("model", row.getModel());
        snap.put("problemCategory", row.getProblemCategory());
        snap.put("status", row.getStatus() == null ? null : row.getStatus().name());
        snap.put("impactAreas", row.getImpactAreas());
        return snap;
    }
}
