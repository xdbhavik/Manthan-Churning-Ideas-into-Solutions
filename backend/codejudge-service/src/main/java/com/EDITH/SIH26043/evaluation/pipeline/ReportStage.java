package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.entity.AiEvaluation;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.EvaluationCategoryScore;
import com.EDITH.SIH26043.entity.EvaluationFinding;
import com.EDITH.SIH26043.entity.EvaluationReport;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.AiEvaluationRepository;
import com.EDITH.SIH26043.repository.EvaluationCategoryScoreRepository;
import com.EDITH.SIH26043.repository.EvaluationFindingRepository;
import com.EDITH.SIH26043.repository.EvaluationReportRepository;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REPORT_GENERATION stage. Assembles the structured report JSON + a human-readable
 * markdown rendering from the persisted category scores, findings and AI advisory,
 * then moves the evaluation to COMPLETED inside the same transaction.
 */
@Component
public class ReportStage implements Stage {

    private final StageMachine stageMachine;
    private final EvaluationRepository evaluationRepository;
    private final EvaluationCategoryScoreRepository categoryScoreRepository;
    private final EvaluationFindingRepository findingRepository;
    private final AiEvaluationRepository aiEvaluationRepository;
    private final EvaluationReportRepository reportRepository;

    public ReportStage(StageMachine stageMachine,
                       EvaluationRepository evaluationRepository,
                       EvaluationCategoryScoreRepository categoryScoreRepository,
                       EvaluationFindingRepository findingRepository,
                       AiEvaluationRepository aiEvaluationRepository,
                       EvaluationReportRepository reportRepository) {
        this.stageMachine = stageMachine;
        this.evaluationRepository = evaluationRepository;
        this.categoryScoreRepository = categoryScoreRepository;
        this.findingRepository = findingRepository;
        this.aiEvaluationRepository = aiEvaluationRepository;
        this.reportRepository = reportRepository;
    }

    @Override
    public EvaluationStatus status() {
        return EvaluationStatus.REPORT_GENERATION;
    }

    @Override
    @Transactional
    public void execute(EvaluationContext context) {
        stageMachine.transition(context.getEvaluationId(), status(), "assembling evaluation report");

        reportRepository.deleteByEvaluationId(context.getEvaluationId());

        Evaluation evaluation = evaluationRepository.findById(context.getEvaluationId()).orElseThrow();
        List<EvaluationCategoryScore> scores = categoryScoreRepository
                .findByEvaluationIdOrderByCategoryKeyAsc(context.getEvaluationId());
        List<EvaluationFinding> findings = findingRepository
                .findByEvaluationIdOrderBySeverityDescCreatedAtAsc(context.getEvaluationId());
        Optional<AiEvaluation> ai = aiEvaluationRepository
                .findFirstByEvaluationIdOrderByCreatedAtDesc(context.getEvaluationId());

        Map<String, Object> reportJson = assembleJson(evaluation, scores, findings, ai);

        EvaluationReport row = new EvaluationReport();
        row.setEvaluationId(context.getEvaluationId());
        row.setReportJson(reportJson);
        row.setReportMarkdown(assembleMarkdown(evaluation, scores, findings, ai));
        reportRepository.save(row);

        // Terminal transition — the whole report is persisted in this transaction,
        // so reaching COMPLETED guarantees a readable report exists.
        stageMachine.transition(context.getEvaluationId(), EvaluationStatus.COMPLETED,
                "Evaluation completed");
    }

    private Map<String, Object> assembleJson(Evaluation evaluation,
                                             List<EvaluationCategoryScore> scores,
                                             List<EvaluationFinding> findings,
                                             Optional<AiEvaluation> ai) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("evaluationId", evaluation.getEvaluationId().toString());
        json.put("submissionId", evaluation.getSubmissionId().toString());
        json.put("status", evaluation.getStatus().name());
        json.put("scoringVersion", evaluation.getScoringVersion());
        json.put("finalScore", evaluation.getFinalScore());
        json.put("verdict", evaluation.getVerdict() == null ? null : evaluation.getVerdict().name());
        json.put("generatedAt", Instant.now().toString());

        List<Map<String, Object>> categories = new ArrayList<>();
        for (EvaluationCategoryScore s : scores) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("categoryKey", s.getCategoryKey());
            m.put("score", s.getScore());
            m.put("maxScore", s.getMaxScore());
            m.put("weight", s.getWeight());
            m.put("status", s.getStatus());
            m.put("note", s.getNote());
            categories.add(m);
        }
        json.put("categories", categories);

        List<Map<String, Object>> findingList = new ArrayList<>();
        for (EvaluationFinding f : findings) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("severity", f.getSeverity().name());
            m.put("category", f.getCategory());
            m.put("message", f.getMessage());
            m.put("evidenceRef", f.getEvidenceRef());
            findingList.add(m);
        }
        json.put("findings", findingList);

        if (ai.isPresent()) {
            json.put("ai", ai.get().getPayload());
        }
        return json;
    }

    private String assembleMarkdown(Evaluation evaluation,
                                    List<EvaluationCategoryScore> scores,
                                    List<EvaluationFinding> findings,
                                    Optional<AiEvaluation> ai) {
        StringBuilder sb = new StringBuilder();
        sb.append("# CodeJudge Evaluation Report\n\n");
        sb.append("- **Evaluation:** `").append(evaluation.getEvaluationId()).append("`\n");
        sb.append("- **Status:** `").append(evaluation.getStatus()).append("`\n");
        sb.append("- **Final score:** ")
                .append(evaluation.getFinalScore() == null ? "—" : evaluation.getFinalScore())
                .append(" / 100\n");
        sb.append("- **Verdict:** ")
                .append(evaluation.getVerdict() == null ? "—" : evaluation.getVerdict())
                .append("\n");
        if (evaluation.getScoringVersion() != null) {
            sb.append("- **Scoring version:** `").append(evaluation.getScoringVersion()).append("`\n");
        }
        sb.append("\n## Category scores\n\n| Category | Score | Max | Status |\n|---|---|---|---|\n");
        for (EvaluationCategoryScore s : scores) {
            sb.append("| ").append(s.getCategoryKey())
                    .append(" | ").append(s.getScore())
                    .append(" | ").append(s.getMaxScore())
                    .append(" | ").append(s.getStatus())
                    .append(" |\n");
        }
        if (!findings.isEmpty()) {
            sb.append("\n## Findings\n\n");
            for (EvaluationFinding f : findings) {
                sb.append("- **").append(f.getSeverity()).append("** [")
                        .append(f.getCategory()).append("] ").append(f.getMessage());
                if (f.getEvidenceRef() != null) {
                    sb.append(" (`").append(f.getEvidenceRef()).append("`)");
                }
                sb.append("\n");
            }
        }
        ai.ifPresent(row -> {
            sb.append("\n## AI advisory (not a score)\n\n");
            sb.append("- **Status:** ").append(row.getStatus()).append("\n");
            if (row.getModel() != null) {
                sb.append("- **Model:** ").append(row.getModel()).append("\n");
            }
            Object note = row.getPayload().get("note");
            if (note != null) {
                sb.append("- **Note:** ").append(note).append("\n");
            }
        });
        return sb.toString();
    }
}
