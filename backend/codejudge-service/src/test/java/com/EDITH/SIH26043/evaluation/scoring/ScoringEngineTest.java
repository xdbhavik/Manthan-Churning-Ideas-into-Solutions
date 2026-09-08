package com.EDITH.SIH26043.evaluation.scoring;

import com.EDITH.SIH26043.entity.CodeAnalysis;
import com.EDITH.SIH26043.entity.EvaluationCategory;
import com.EDITH.SIH26043.entity.EvaluationPolicy;
import com.EDITH.SIH26043.entity.SecurityFinding;
import com.EDITH.SIH26043.enums.FindingSeverity;
import com.EDITH.SIH26043.enums.Verdict;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The deterministic weighted engine: category scores come only from collected
 * evidence, categories with no evidence source are reported NOT_EVALUATED at 0
 * (never guessed), HIGH security findings subtract the configured penalty, and a
 * CRITICAL finding trips the BLOCK policy into a BLOCKED verdict regardless of
 * the total. The AI never contributes.
 */
class ScoringEngineTest {

    private static final List<EvaluationCategory> CATEGORIES = List.of(
            category("PROBLEM_ALIGNMENT", 25),
            category("FUNCTIONAL", 25),
            category("ENGINEERING", 15),
            category("ARCHITECTURE", 10),
            category("TESTING", 10),
            category("INNOVATION", 5),
            category("SECURITY", 5),
            category("DOCUMENTATION", 5));

    private static final List<EvaluationPolicy> POLICIES = List.of(
            policy("CRITICAL_SECURITY_BLOCK", "BLOCK", 1),
            policy("HIGH_SECURITY_PENALTY", "PENALTY", 3),
            policy("PASSING_SCORE", "NONE", 40));

    @Test
    void awardsFullMarksForPerfectEvidenceAndNoFindings() {
        // Every analyzer category at its own maximum.
        List<CodeAnalysis> analyses = List.of(
                analysis("bootstrap", 15, 15),
                analysis("entry_points", 15, 15),
                analysis("code_quality", 10, 10),
                analysis("architecture", 15, 15),
                analysis("testing", 15, 15),
                analysis("security", 10, 10),
                analysis("documentation", 20, 20));

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses, List.of(), CATEGORIES, POLICIES);

        // Only the four evidence-backed categories can score: 15 + 10 + 10 + 5 + 5 = 45.
        assertThat(outcome.total()).isEqualTo(45.0);
        assertThat(outcome.verdict()).isEqualTo(Verdict.NEEDS_WORK);
        assertThat(evaluated(outcome, "ENGINEERING")).isEqualTo(15.0);
        assertThat(evaluated(outcome, "ARCHITECTURE")).isEqualTo(10.0);
        assertThat(evaluated(outcome, "TESTING")).isEqualTo(10.0);
        assertThat(evaluated(outcome, "SECURITY")).isEqualTo(5.0);
        assertThat(evaluated(outcome, "DOCUMENTATION")).isEqualTo(5.0);
    }

    @Test
    void marksSandboxAndCuratedCategoriesNotEvaluatedRatherThanGuessing() {
        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(
                List.of(analysis("bootstrap", 15, 15)), List.of(), CATEGORIES, POLICIES);

        ScoringEngine.CategoryResult functional = result(outcome, "FUNCTIONAL");
        ScoringEngine.CategoryResult alignment = result(outcome, "PROBLEM_ALIGNMENT");
        ScoringEngine.CategoryResult innovation = result(outcome, "INNOVATION");

        assertThat(functional.status()).isEqualTo("NOT_EVALUATED");
        assertThat(functional.score()).isZero();
        assertThat(functional.note()).contains("sandbox");
        assertThat(alignment.status()).isEqualTo("NOT_EVALUATED");
        assertThat(innovation.status()).isEqualTo("NOT_EVALUATED");
    }

    @Test
    void scalesPartialEvidenceProportionally() {
        // ENGINEERING draws from bootstrap+entry_points+code_quality = 20/40 → half of 15.
        List<CodeAnalysis> analyses = List.of(
                analysis("bootstrap", 10, 15),
                analysis("entry_points", 5, 15),
                analysis("code_quality", 5, 10));

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses, List.of(), CATEGORIES, POLICIES);

        assertThat(evaluated(outcome, "ENGINEERING")).isEqualTo(7.5);
        assertThat(outcome.total()).isEqualTo(7.5);
    }

    @Test
    void subtractsTheConfiguredPenaltyPerHighFinding() {
        List<CodeAnalysis> analyses = List.of(analysis("security", 10, 10));
        List<SecurityFinding> findings = List.of(
                finding(FindingSeverity.HIGH), finding(FindingSeverity.HIGH));

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses, findings, CATEGORIES, POLICIES);

        // Security scores 5, two HIGH findings cost 3 each → floored at 0, never negative.
        ScoringEngine.CategoryResult security = result(outcome, "SECURITY");
        assertThat(security.score()).isZero();
        assertThat(security.status()).isEqualTo("EVALUATED");
        assertThat(security.note()).contains("2 HIGH finding");
        assertThat(outcome.total()).isZero();
    }

    @Test
    void blocksOnCriticalFindingRegardlessOfScore() {
        List<CodeAnalysis> analyses = List.of(
                analysis("bootstrap", 15, 15),
                analysis("entry_points", 15, 15),
                analysis("code_quality", 10, 10));
        List<SecurityFinding> findings = List.of(finding(FindingSeverity.CRITICAL));

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses, findings, CATEGORIES, POLICIES);

        assertThat(outcome.verdict()).isEqualTo(Verdict.BLOCKED);
        assertThat(outcome.note()).contains("1 CRITICAL");
        // The total is still computed and reported — blocking is a verdict, not a wipe.
        assertThat(outcome.total()).isEqualTo(15.0);
    }

    @Test
    void doesNotBlockWhenTheBlockPolicyIsInactive() {
        List<EvaluationPolicy> inactive = List.of(
                inactive(policy("CRITICAL_SECURITY_BLOCK", "BLOCK", 1)),
                policy("HIGH_SECURITY_PENALTY", "PENALTY", 3));
        List<CodeAnalysis> analyses = List.of(analysis("bootstrap", 15, 15));

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(analyses,
                List.of(finding(FindingSeverity.CRITICAL)), CATEGORIES, inactive);

        assertThat(outcome.verdict()).isNotEqualTo(Verdict.BLOCKED);
    }

    @Test
    void skipsInactiveCategoriesEntirely() {
        EvaluationCategory disabled = category("DOCUMENTATION", 5);
        disabled.setActive(false);
        List<EvaluationCategory> categories = List.of(category("ENGINEERING", 15), disabled);

        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(
                List.of(analysis("bootstrap", 15, 15), analysis("documentation", 20, 20)),
                List.of(), categories, POLICIES);

        assertThat(outcome.categories()).extracting(ScoringEngine.CategoryResult::categoryKey)
                .containsExactly("ENGINEERING");
    }

    @Test
    void reportsExcellentAndGoodBands() {
        // A single 100-weight category makes the band arithmetic explicit.
        List<EvaluationCategory> single = List.of(category("ENGINEERING", 100));

        ScoringEngine.Outcome excellent = ScoringEngine.evaluate(
                List.of(analysis("bootstrap", 15, 15)), List.of(), single, POLICIES);
        assertThat(excellent.total()).isEqualTo(100.0);
        assertThat(excellent.verdict()).isEqualTo(Verdict.EXCELLENT);

        ScoringEngine.Outcome good = ScoringEngine.evaluate(
                List.of(analysis("bootstrap", 10, 15)), List.of(), single, POLICIES);
        assertThat(good.total()).isEqualTo(66.67);
        assertThat(good.verdict()).isEqualTo(Verdict.GOOD);
    }

    @Test
    void treatsAnEvidenceRowWithZeroMaxAsNotEvaluated() {
        ScoringEngine.Outcome outcome = ScoringEngine.evaluate(
                List.of(analysis("testing", 0, 0)), List.of(),
                List.of(category("TESTING", 10)), POLICIES);

        assertThat(result(outcome, "TESTING").status()).isEqualTo("NOT_EVALUATED");
        assertThat(outcome.total()).isZero();
    }

    // -- fixtures -----------------------------------------------------------

    private static double evaluated(ScoringEngine.Outcome outcome, String key) {
        ScoringEngine.CategoryResult r = result(outcome, key);
        assertThat(r.status()).isEqualTo("EVALUATED");
        return r.score();
    }

    private static ScoringEngine.CategoryResult result(ScoringEngine.Outcome outcome, String key) {
        return outcome.categories().stream()
                .filter(c -> c.categoryKey().equals(key))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No category result for " + key));
    }

    private static EvaluationCategory category(String key, double weight) {
        EvaluationCategory c = new EvaluationCategory();
        c.setCategoryKey(key);
        c.setName(key);
        c.setMaxScore(weight);
        c.setWeight(weight);
        c.setActive(true);
        return c;
    }

    private static EvaluationPolicy policy(String ruleKey, String action, double amount) {
        EvaluationPolicy p = new EvaluationPolicy();
        p.setRuleKey(ruleKey);
        p.setAction(action);
        p.setAmount(amount);
        p.setActive(true);
        return p;
    }

    private static EvaluationPolicy inactive(EvaluationPolicy p) {
        p.setActive(false);
        return p;
    }

    private static CodeAnalysis analysis(String categoryKey, double score, double max) {
        CodeAnalysis a = new CodeAnalysis();
        a.setCategoryKey(categoryKey);
        a.setScore(score);
        a.setMaxScore(max);
        a.setTool("agentic-legibility");
        return a;
    }

    private static SecurityFinding finding(FindingSeverity severity) {
        SecurityFinding f = new SecurityFinding();
        f.setSeverity(severity);
        f.setType("test");
        f.setMessage("test finding");
        return f;
    }
}
