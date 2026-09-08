package com.EDITH.SIH26043.evaluation.scoring;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The rubric that turns the analyzer's raw signal facts into a score. It must be
 * tolerant across analyzer versions: unknown keys are ignored and missing keys
 * count as false, so a newer analyzer that adds signals never breaks scoring.
 */
class LegibilitySignalScorerTest {

    @Test
    void scoresTheFractionOfSatisfiedSignalsAgainstTheCategoryMaximum() {
        // bootstrap considers 10 signals and is worth 15; 5 satisfied → 7.5.
        Map<String, Object> signals = signals(
                "readme_exists", true,
                "readme_has_setup", true,
                "readme_has_commands", true,
                "lockfile", true,
                "package_manifest", true);

        ScoredSignals scored = LegibilitySignalScorer.score("bootstrap", signals);

        assertThat(scored.maxScore()).isEqualTo(15.0);
        assertThat(scored.total()).isEqualTo(10);
        assertThat(scored.satisfied()).isEqualTo(5);
        assertThat(scored.score()).isEqualTo(7.5);
    }

    @Test
    void ignoresUnknownSignalKeysFromANewerAnalyzerVersion() {
        Map<String, Object> signals = signals(
                "has_linter", true,
                "has_formatter", true,
                "has_typecheck", true,
                "has_git_hooks", true,
                "some_future_signal_we_do_not_know", true);

        ScoredSignals scored = LegibilitySignalScorer.score("code_quality", signals);

        // All four known code_quality signals satisfied → full 10; the extra is not counted.
        assertThat(scored.total()).isEqualTo(4);
        assertThat(scored.satisfied()).isEqualTo(4);
        assertThat(scored.score()).isEqualTo(10.0);
    }

    @Test
    void treatsMissingAndFalseSignalsAsUnsatisfied() {
        ScoredSignals none = LegibilitySignalScorer.score("security", Map.of());
        ScoredSignals explicitlyFalse = LegibilitySignalScorer.score("security",
                signals("gitignore", false, "gitleaks", false));

        assertThat(none.score()).isZero();
        assertThat(none.maxScore()).isEqualTo(10.0);
        assertThat(explicitlyFalse.score()).isZero();
        assertThat(explicitlyFalse.satisfied()).isZero();
    }

    @Test
    void handlesNullSignalMapsWithoutThrowing() {
        ScoredSignals scored = LegibilitySignalScorer.score("testing", null);

        assertThat(scored.score()).isZero();
        assertThat(scored.maxScore()).isEqualTo(15.0);
    }

    @Test
    void returnsZeroMaxForAnUnknownCategory() {
        ScoredSignals scored = LegibilitySignalScorer.score("not_a_category", Map.of("x", true));

        assertThat(scored.maxScore()).isZero();
        assertThat(scored.score()).isZero();
        assertThat(scored.total()).isZero();
    }

    @Test
    void countsNumbersAndNonBlankStringsAsSatisfiedSignals() {
        // The analyzer emits counts and lists as well as booleans.
        assertThat(LegibilitySignalScorer.truthy(Boolean.TRUE)).isTrue();
        assertThat(LegibilitySignalScorer.truthy(Boolean.FALSE)).isFalse();
        assertThat(LegibilitySignalScorer.truthy(3)).isTrue();
        assertThat(LegibilitySignalScorer.truthy(0)).isFalse();
        assertThat(LegibilitySignalScorer.truthy("docs/architecture.md")).isTrue();
        assertThat(LegibilitySignalScorer.truthy("  ")).isFalse();
        assertThat(LegibilitySignalScorer.truthy(null)).isFalse();
    }

    @Test
    void knownCategoriesCoverTheSevenAnalyzerCategories() {
        assertThat(LegibilitySignalScorer.knownCategories())
                .containsExactlyInAnyOrder("bootstrap", "entry_points", "documentation",
                        "architecture", "testing", "code_quality", "security");
        // The maxima are the evidence denominators the weighted engine divides by.
        assertThat(LegibilitySignalScorer.ANALYZER_MAX.values().stream()
                .mapToDouble(Double::doubleValue).sum()).isEqualTo(100.0);
    }

    private static Map<String, Object> signals(Object... pairs) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(String.valueOf(pairs[i]), pairs[i + 1]);
        }
        return map;
    }
}
