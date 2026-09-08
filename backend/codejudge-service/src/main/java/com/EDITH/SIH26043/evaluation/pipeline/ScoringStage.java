package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.evaluation.scoring.ScoringEngine;
import com.EDITH.SIH26043.entity.CodeAnalysis;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.EvaluationCategory;
import com.EDITH.SIH26043.entity.EvaluationCategoryScore;
import com.EDITH.SIH26043.entity.EvaluationFinding;
import com.EDITH.SIH26043.entity.EvaluationPolicy;
import com.EDITH.SIH26043.entity.SecurityFinding;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.enums.FindingSeverity;
import com.EDITH.SIH26043.repository.CodeAnalysisRepository;
import com.EDITH.SIH26043.repository.EvaluationCategoryRepository;
import com.EDITH.SIH26043.repository.EvaluationCategoryScoreRepository;
import com.EDITH.SIH26043.repository.EvaluationFindingRepository;
import com.EDITH.SIH26043.repository.EvaluationPolicyRepository;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.repository.SecurityFindingRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * SCORING stage. Feeds the collected evidence (code_analysis rows + security
 * findings) and the seeded config (evaluation_category + evaluation_policy) into
 * the pure {@link ScoringEngine}, persists one {@code evaluation_category_score}
 * row per category plus human-readable findings, and writes the final score +
 * verdict + config snapshot onto the evaluation row. The AI is never consulted.
 */
@Component
public class ScoringStage implements Stage {

    /** Code-side rubric version; bump when the deterministic mapping changes. */
    static final String SCORING_VERSION = "deterministic-1";

    private final StageMachine stageMachine;
    private final CodeAnalysisRepository codeAnalysisRepository;
    private final SecurityFindingRepository securityFindingRepository;
    private final EvaluationCategoryRepository categoryRepository;
    private final EvaluationPolicyRepository policyRepository;
    private final EvaluationCategoryScoreRepository categoryScoreRepository;
    private final EvaluationFindingRepository findingRepository;
    private final EvaluationRepository evaluationRepository;

    public ScoringStage(StageMachine stageMachine,
                        CodeAnalysisRepository codeAnalysisRepository,
                        SecurityFindingRepository securityFindingRepository,
                        EvaluationCategoryRepository categoryRepository,
                        EvaluationPolicyRepository policyRepository,
                        EvaluationCategoryScoreRepository categoryScoreRepository,
                        EvaluationFindingRepository findingRepository,
                        EvaluationRepository evaluationRepository) {
        this.stageMachine = stageMachine;
        this.codeAnalysisRepository = codeAnalysisRepository;
        this.securityFindingRepository = securityFindingRepository;
        this.categoryRepository = categoryRepository;
        this.policyRepository = policyRepository;
        this.categoryScoreRepository = categoryScoreRepository;
        this.findingRepository = findingRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @Override
    public EvaluationStatus status() {
        return EvaluationStatus.SCORING;
    }

    @Override
    @Transactional
    public void execute(EvaluationContext context) {
        stageMachine.transition(context.getEvaluationId(), status(), "deterministic scoring");

        List<CodeAnalysis> analyses = codeAnalysisRepository.findByEvaluationId(context.getEvaluationId());
        List<SecurityFinding> findings = securityFindingRepository.findByEvaluationIdOrderBySeverityAsc(
                context.getEvaluationId());
        List<EvaluationCategory> categories = categoryRepository.findByActiveTrueOrderBySortOrderAsc();
        List<EvaluationPolicy> policies = policyRepository.findByActiveTrue();

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses, findings, categories, policies);

        // Idempotent: re-scoring replaces previous per-category rows + findings.
        categoryScoreRepository.deleteByEvaluationId(context.getEvaluationId());
        findingRepository.deleteByEvaluationId(context.getEvaluationId());

        List<EvaluationCategoryScore> scoreRows = new ArrayList<>();
        for (ScoringEngine.CategoryResult r : outcome.categories()) {
            EvaluationCategoryScore row = new EvaluationCategoryScore();
            row.setEvaluationId(context.getEvaluationId());
            row.setCategoryKey(r.categoryKey());
            row.setScore(r.score());
            row.setMaxScore(r.maxScore());
            row.setWeight(r.weight());
            row.setStatus(r.status());
            row.setNote(r.note());
            scoreRows.add(row);
        }
        categoryScoreRepository.saveAll(scoreRows);

        List<EvaluationFinding> findingRows = new ArrayList<>();
        for (SecurityFinding f : findings) {
            if (f.getSeverity() == FindingSeverity.CRITICAL || f.getSeverity() == FindingSeverity.HIGH) {
                findingRows.add(toFinding(context, f));
            }
        }
        findingRepository.saveAll(findingRows);

        Evaluation evaluation = evaluationRepository.findById(context.getEvaluationId()).orElseThrow();
        evaluation.setFinalScore(outcome.total());
        evaluation.setVerdict(outcome.verdict());
        evaluation.setScoringVersion(SCORING_VERSION);
        evaluation.setConfigSnapshot(configSnapshot(categories, policies));
        Map<String, Object> tools = new LinkedHashMap<>();
        for (CodeAnalysis a : analyses) {
            tools.putIfAbsent(a.getTool(), a.getToolVersion() == null ? "?" : a.getToolVersion());
        }
        evaluation.setToolVersions(tools);
        evaluationRepository.save(evaluation);
    }

    private EvaluationFinding toFinding(EvaluationContext context, SecurityFinding f) {
        EvaluationFinding row = new EvaluationFinding();
        row.setEvaluationId(context.getEvaluationId());
        row.setSeverity(f.getSeverity());
        row.setCategory("SECURITY");
        row.setMessage(f.getType() + ": " + f.getMessage());
        row.setEvidenceRef(f.getFile() == null ? null : f.getFile() + (f.getLine() == null ? "" : "#L" + f.getLine()));
        return row;
    }

    private Map<String, Object> configSnapshot(List<EvaluationCategory> categories,
                                               List<EvaluationPolicy> policies) {
        Map<String, Object> snap = new LinkedHashMap<>();
        List<Map<String, Object>> catList = new ArrayList<>();
        for (EvaluationCategory c : categories) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("categoryKey", c.getCategoryKey());
            m.put("name", c.getName());
            m.put("maxScore", c.getMaxScore());
            m.put("weight", c.getWeight());
            catList.add(m);
        }
        List<Map<String, Object>> polList = new ArrayList<>();
        for (EvaluationPolicy p : policies) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleKey", p.getRuleKey());
            m.put("severity", p.getSeverity() == null ? null : p.getSeverity().name());
            m.put("action", p.getAction());
            m.put("amount", p.getAmount());
            polList.add(m);
        }
        snap.put("scoringVersion", SCORING_VERSION);
        snap.put("categories", catList);
        snap.put("policies", polList);
        return snap;
    }
}
