package com.EDITH.SIH26043.evaluation.scoring;

import com.EDITH.SIH26043.entity.CodeAnalysis;
import com.EDITH.SIH26043.entity.EvaluationCategory;
import com.EDITH.SIH26043.entity.EvaluationPolicy;
import com.EDITH.SIH26043.entity.SecurityFinding;
import com.EDITH.SIH26043.enums.FindingSeverity;
import com.EDITH.SIH26043.enums.Verdict;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The deterministic weighted scoring engine. Pure function of
 * {@code score(categoryResults, policy) -> total}: no I/O, fully unit-testable.
 *
 * <pre>
 *   Final Score = Σ( CategoryScore / CategoryMax × CategoryWeight )
 * </pre>
 *
 * <p>Category scores come from the mapped agentic-legibility evidence
 * ({@code code_analysis} rows). Categories that require a sandboxed runtime or
 * curated requirements (Problem Alignment, Functional, Innovation) carry no
 * source rows in this deployment, so they are marked {@code NOT_EVALUATED} at 0
 * — never guessed. Security penalties (HIGH findings) subtract from the Security
 * category; a CRITICAL finding trips the {@code BLOCK} policy into a BLOCKED
 * verdict. The AI never hands out marks here.</p>
 */
public final class ScoringEngine {

    private ScoringEngine() {
    }

    private static final String STATUS_EVALUATED = "EVALUATED";
    private static final String STATUS_NOT_EVALUATED = "NOT_EVALUATED";

    /** CodeJudge category key -> agentic-legibility evidence category keys that feed it. */
    private static final Map<String, List<String>> SOURCE_KEYS = Map.of(
            "PROBLEM_ALIGNMENT", List.of(),
            "FUNCTIONAL", List.of(),
            "ENGINEERING", List.of("bootstrap", "entry_points", "code_quality"),
            "ARCHITECTURE", List.of("architecture"),
            "TESTING", List.of("testing"),
            "INNOVATION", List.of(),
            "SECURITY", List.of("security"),
            "DOCUMENTATION", List.of("documentation"));

    public record CategoryResult(String categoryKey, String name, double score, double maxScore,
                                 double weight, String status, String note) {
    }

    public record Outcome(double total, Verdict verdict, String note, List<CategoryResult> categories) {
    }

    public static Outcome evaluate(List<CodeAnalysis> analyses,
                                   List<SecurityFinding> findings,
                                   List<EvaluationCategory> categories,
                                   List<EvaluationPolicy> policies) {
        Map<String, CodeAnalysis> byKey = new LinkedHashMap<>();
        for (CodeAnalysis a : analyses) {
            byKey.putIfAbsent(a.getCategoryKey(), a);
        }

        long criticalCount = findings.stream().filter(f -> f.getSeverity() == FindingSeverity.CRITICAL).count();
        long highCount = findings.stream().filter(f -> f.getSeverity() == FindingSeverity.HIGH).count();

        boolean block = criticalCount > 0 && activeAmount(policies, "CRITICAL_SECURITY_BLOCK") > 0;
        double highPenalty = activeAmount(policies, "HIGH_SECURITY_PENALTY");

        List<CategoryResult> results = new ArrayList<>();
        double total = 0;
        for (EvaluationCategory cat : categories) {
            if (!cat.isActive()) {
                continue;
            }
            CategoryResult r = scoreCategory(cat, byKey, findings, highCount, highPenalty);
            results.add(r);
            if (STATUS_EVALUATED.equals(r.status())) {
                total += r.score();
            }
        }
        total = round2(total);

        Verdict verdict;
        String note;
        if (block) {
            verdict = Verdict.BLOCKED;
            note = "Blocked by " + criticalCount + " CRITICAL security finding(s)";
        } else {
            verdict = verdictFor(total);
            note = verdict == Verdict.NEEDS_WORK && total < 40
                    ? "Score below the config passing bar (40)"
                    : "Deterministic score from static evidence";
        }
        return new Outcome(total, verdict, note, List.copyOf(results));
    }

    private static CategoryResult scoreCategory(EvaluationCategory cat,
                                                Map<String, CodeAnalysis> byKey,
                                                List<SecurityFinding> findings,
                                                long highCount,
                                                double highPenalty) {
        String key = cat.getCategoryKey();
        double catMax = cat.getMaxScore() == null ? cat.getWeight() : cat.getMaxScore();
        double weight = cat.getWeight() == null ? catMax : cat.getWeight();

        List<String> sources = SOURCE_KEYS.getOrDefault(key, List.of());
        if (sources.isEmpty()) {
            return new CategoryResult(key, cat.getName(), 0, catMax, weight, STATUS_NOT_EVALUATED,
                    notEvaluatedNote(key));
        }

        double evidenceScore = 0;
        double evidenceMax = 0;
        boolean anySourceRow = false;
        for (String source : sources) {
            CodeAnalysis row = byKey.get(source);
            if (row != null) {
                anySourceRow = true;
                evidenceScore += row.getScore() == null ? 0 : row.getScore();
                evidenceMax += row.getMaxScore() == null ? 0 : row.getMaxScore();
            }
        }
        if (!anySourceRow || evidenceMax <= 0) {
            return new CategoryResult(key, cat.getName(), 0, catMax, weight, STATUS_NOT_EVALUATED,
                    "No evidence collected for this category");
        }

        double score = round2(evidenceScore / evidenceMax * catMax);

        if ("SECURITY".equals(key)) {
            double penalty = highCount * highPenalty;
            if (penalty > 0) {
                double before = score;
                score = Math.max(0, round2(score - penalty));
                return new CategoryResult(key, cat.getName(), score, catMax, weight, STATUS_EVALUATED,
                        "Reduced by " + round2(before - score) + " for " + highCount + " HIGH finding(s)");
            }
        }
        return new CategoryResult(key, cat.getName(), score, catMax, weight, STATUS_EVALUATED,
                "From agentic-legibility evidence (" + sources + ")");
    }

    private static String notEvaluatedNote(String key) {
        return switch (key) {
            case "PROBLEM_ALIGNMENT" ->
                    "Requires curated requirements + runtime evidence (not evaluated in this deployment)";
            case "FUNCTIONAL" ->
                    "Requires build/run/test sandbox (app.codejudge.sandbox-enabled=false)";
            case "INNOVATION" -> "Advisory rubric not run";
            default -> "No evidence source mapped";
        };
    }

    private static double activeAmount(List<EvaluationPolicy> policies, String ruleKey) {
        for (EvaluationPolicy p : policies) {
            if (ruleKey.equals(p.getRuleKey()) && p.isActive() && p.getAmount() != null) {
                return p.getAmount();
            }
        }
        return 0;
    }

    private static Verdict verdictFor(double total) {
        if (total >= 80) {
            return Verdict.EXCELLENT;
        }
        if (total >= 60) {
            return Verdict.GOOD;
        }
        return Verdict.NEEDS_WORK;
    }

    static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
