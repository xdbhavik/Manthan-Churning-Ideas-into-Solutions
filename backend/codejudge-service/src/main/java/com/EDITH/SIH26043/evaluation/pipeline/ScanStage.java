package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.evaluation.evidence.AgenticLegibilityInvoker;
import com.EDITH.SIH26043.evaluation.evidence.AnalyzerResult;
import com.EDITH.SIH26043.evaluation.evidence.StaticHeuristicsScanner;
import com.EDITH.SIH26043.evaluation.scoring.LegibilitySignalScorer;
import com.EDITH.SIH26043.evaluation.scoring.ScoredSignals;
import com.EDITH.SIH26043.entity.CodeAnalysis;
import com.EDITH.SIH26043.enums.AnalysisStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.CodeAnalysisRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * SCANNING stage — the engineering-evidence collector. It runs the external
 * Python {@code agentic-legibility} analyzer over the workspace; when that is
 * unavailable (no Python / missing script / timeout) it falls back to the
 * built-in {@link StaticHeuristicsScanner} so the engineering categories are
 * never silently empty. Each analyzer category is scored by the deterministic
 * signal rubric and persisted as a {@code code_analysis} evidence row.
 */
@Component
public class ScanStage implements Stage {

    private static final Logger log = LoggerFactory.getLogger(ScanStage.class);

    private static final String TOOL_ANALYZER = "agentic-legibility";
    private static final String TOOL_HEURISTIC = "codejudge-static-heuristics";

    private final StageMachine stageMachine;
    private final CodeAnalysisRepository codeAnalysisRepository;
    private final AgenticLegibilityInvoker analyzerInvoker;

    public ScanStage(StageMachine stageMachine,
                     CodeAnalysisRepository codeAnalysisRepository,
                     AgenticLegibilityInvoker analyzerInvoker) {
        this.stageMachine = stageMachine;
        this.codeAnalysisRepository = codeAnalysisRepository;
        this.analyzerInvoker = analyzerInvoker;
    }

    @Override
    public EvaluationStatus status() {
        return EvaluationStatus.SCANNING;
    }

    @Override
    @Transactional
    public void execute(EvaluationContext context) {
        stageMachine.transition(context.getEvaluationId(), status(),
                "agentic-legibility (or static fallback) scan");

        if (!Files.isDirectory(context.getWorkspaceDir())) {
            throw new IllegalStateException("Workspace missing for evaluation "
                    + context.getEvaluationId() + " (clone stage did not produce it)");
        }

        AnalyzerResult result = analyzerInvoker.run(context.getWorkspaceDir());
        Map<String, Object> signalsByCategory;
        String tool;
        AnalysisStatus analysisStatus;
        if (result.available()) {
            signalsByCategory = result.signalsByCategory();
            tool = TOOL_ANALYZER;
            analysisStatus = AnalysisStatus.SUCCESS;
        } else {
            log.warn("agentic-legibility analyzer unavailable for evaluation {} ({}); "
                            + "using static-heuristics fallback",
                    context.getEvaluationId(), result.error());
            signalsByCategory = StaticHeuristicsScanner.scan(context.getWorkspaceDir());
            tool = TOOL_HEURISTIC;
            analysisStatus = AnalysisStatus.HEURISTIC_FALLBACK;
        }

        // Idempotent: a retried evaluation must not double-count old evidence.
        codeAnalysisRepository.deleteByEvaluationId(context.getEvaluationId());

        List<CodeAnalysis> rows = new ArrayList<>();
        for (String categoryKey : LegibilitySignalScorer.knownCategories()) {
            ScoredSignals scored = LegibilitySignalScorer.score(categoryKey,
                    asMap(signalsByCategory.get(categoryKey)));
            CodeAnalysis row = new CodeAnalysis();
            row.setEvaluationId(context.getEvaluationId());
            row.setCategoryKey(categoryKey);
            row.setScore(scored.score());
            row.setMaxScore(scored.maxScore());
            row.setPayload(asMap(signalsByCategory.get(categoryKey)));
            row.setTool(tool);
            row.setStatus(analysisStatus);
            rows.add(row);
        }
        codeAnalysisRepository.saveAll(rows);
        log.info("Evaluation {} scan complete: {} rows via {}",
                context.getEvaluationId(), rows.size(), tool);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return new LinkedHashMap<>();
    }
}
