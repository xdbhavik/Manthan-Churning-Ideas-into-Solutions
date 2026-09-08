package com.EDITH.SIH26043.evaluation.scoring;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Deterministic rubric that turns one agentic-legibility category's raw signal
 * map into a score. It is pure (no I/O) and tolerant: unknown/missing signal
 * keys simply count as false, so the rubric keeps working across analyzer
 * versions that add signals.
 *
 * <p>The analyzer emits only booleans/counts/lists (facts), never a score.
 * Each category lists the boolean signals that indicate good behaviour; the
 * fraction satisfied scales the analyzer category's own maximum (bootstrap 15,
 * entry_points 15, documentation 20, architecture 15, testing 15, code_quality
 * 10, security 10). These maxima are the evidence denominator CodeJudge's
 * weighted scoring engine later combines with the CodeJudge category weights.</p>
 */
public final class LegibilitySignalScorer {

    private LegibilitySignalScorer() {
    }

    /** Analyzer category key -> its own rubric maximum (from agentic_legibility_score.py docstrings). */
    public static final Map<String, Double> ANALYZER_MAX = Map.of(
            "bootstrap", 15d,
            "entry_points", 15d,
            "documentation", 20d,
            "architecture", 15d,
            "testing", 15d,
            "code_quality", 10d,
            "security", 10d);

    /** Analyzer category key -> boolean signals that count towards its score. */
    private static final Map<String, List<String>> SIGNALS = Map.ofEntries(
            Map.entry("bootstrap", List.of(
                    "readme_exists", "readme_has_setup", "readme_has_commands",
                    "env_example", "devcontainer", "docker_compose", "dockerfile",
                    "lockfile", "package_manifest", "makefile")),
            Map.entry("entry_points", List.of(
                    "has_build_script", "has_test_script", "has_lint_script",
                    "has_format_script", "has_dev_script", "ci_has_build", "ci_has_test")),
            Map.entry("documentation", List.of(
                    "agents_md", "contributing", "changelog", "code_of_conduct",
                    "license", "docs_directory", "readme_has_badges", "readme_has_toc",
                    "api_docs", "typedoc_or_jsdoc")),
            Map.entry("architecture", List.of(
                    "architecture_md", "has_adrs", "has_design_docs", "has_exec_plans",
                    "quality_score", "tech_debt_tracking", "has_src_dir", "is_monorepo")),
            Map.entry("testing", List.of(
                    "has_test_dir", "ci_configured", "ci_runs_tests", "ci_runs_lint",
                    "ci_runs_typecheck", "jest_config", "vitest_config", "pytest_config",
                    "playwright_config", "cypress_config", "coverage_config")),
            Map.entry("code_quality", List.of(
                    "has_linter", "has_formatter", "has_typecheck", "has_git_hooks")),
            Map.entry("security", List.of(
                    "gitignore", "gitignore_covers_env", "gitignore_covers_secrets",
                    "has_dep_updates", "security_policy", "gitleaks")));

    public static Set<String> knownCategories() {
        return ANALYZER_MAX.keySet();
    }

    /**
     * Score one analyzer category's signals.
     *
     * @param categoryKey analyzer category key
     * @param signals     raw payload map (a {@code Map<String,Object>} from the
     *                    analyzer JSON); booleans/numbers/strings all count as
     *                    satisfied when truthy
     */
    public static ScoredSignals score(String categoryKey, Map<String, Object> signals) {
        List<String> considered = SIGNALS.getOrDefault(categoryKey, List.of());
        if (considered.isEmpty() || signals == null) {
            return new ScoredSignals(0, ANALYZER_MAX.getOrDefault(categoryKey, 0d), 0, considered.size());
        }
        int satisfied = 0;
        for (String key : considered) {
            if (truthy(signals.get(key))) {
                satisfied++;
            }
        }
        double max = ANALYZER_MAX.getOrDefault(categoryKey, 0d);
        double score = max * (considered.isEmpty() ? 0 : (double) satisfied / considered.size());
        return new ScoredSignals(round2(score), max, satisfied, considered.size());
    }

    /** Heuristic-fallback signal maps carry the same booleans under the same keys. */
    public static boolean truthy(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.doubleValue() > 0;
        }
        if (value instanceof String s) {
            return !s.isBlank();
        }
        return false;
    }

    static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
