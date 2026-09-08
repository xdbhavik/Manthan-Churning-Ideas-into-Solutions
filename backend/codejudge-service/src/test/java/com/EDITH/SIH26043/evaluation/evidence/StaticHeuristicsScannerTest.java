package com.EDITH.SIH26043.evaluation.evidence;

import com.EDITH.SIH26043.evaluation.scoring.LegibilitySignalScorer;
import com.EDITH.SIH26043.evaluation.scoring.ScoredSignals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The fallback marker used when Python (or the analyzer script) is absent. Its
 * contract is that it emits the SAME signal keys under the SAME category names the
 * Python analyzer emits, so the deterministic rubric scores a fallback row exactly
 * like a real analyzer row. A well sign-posted repo must score; a bare code dump
 * must not.
 */
class StaticHeuristicsScannerTest {

    @Test
    void emitsEverySevenAnalyzerCategorySoTheRubricAlwaysHasAnInput(@TempDir Path repo) {
        Map<String, Object> signals = StaticHeuristicsScanner.scan(repo);

        assertThat(signals.keySet()).containsExactlyInAnyOrderElementsOf(
                LegibilitySignalScorer.knownCategories());
    }

    @Test
    void scoresNothingForAnEmptyRepository(@TempDir Path repo) {
        Map<String, Object> signals = StaticHeuristicsScanner.scan(repo);

        for (String category : LegibilitySignalScorer.knownCategories()) {
            ScoredSignals scored = LegibilitySignalScorer.score(category, asMap(signals.get(category)));
            assertThat(scored.score()).as(category).isZero();
        }
    }

    @Test
    void detectsBootstrapSignalsFromAWellSignpostedRepository(@TempDir Path repo) throws IOException {
        write(repo, "README.md", """
                # Project
                ## Setup
                Run `npm install` then `npm run dev`.
                """);
        write(repo, "package.json", """
                {"name":"p","scripts":{"build":"tsc","test":"jest","lint":"eslint .","dev":"vite"}}
                """);
        write(repo, "package-lock.json", "{}");
        write(repo, ".env.example", "API_URL=");
        write(repo, "Dockerfile", "FROM node:20\n");
        write(repo, "docker-compose.yml", "services: {}\n");
        write(repo, "Makefile", "build:\n\tnpm run build\n");

        Map<String, Object> bootstrap = asMap(StaticHeuristicsScanner.scan(repo).get("bootstrap"));

        assertThat(bootstrap).containsKeys("readme_exists", "readme_has_setup", "readme_has_commands",
                "env_example", "docker_compose", "dockerfile", "lockfile", "package_manifest", "makefile");
        // 9 of 10 bootstrap signals → 13.5 of 15.
        assertThat(LegibilitySignalScorer.score("bootstrap", bootstrap).satisfied()).isEqualTo(9);
    }

    @Test
    void readsEntryPointsFromPackageScripts(@TempDir Path repo) throws IOException {
        write(repo, "package.json", """
                {
                  "name": "p",
                  "scripts": {
                    "build": "tsc -p .",
                    "test": "vitest run",
                    "lint": "eslint .",
                    "format": "prettier -w .",
                    "dev": "vite"
                  }
                }
                """);

        Map<String, Object> entryPoints = asMap(StaticHeuristicsScanner.scan(repo).get("entry_points"));

        assertThat(entryPoints).containsKeys("has_build_script", "has_test_script",
                "has_lint_script", "has_format_script", "has_dev_script");
    }

    @Test
    void readsCiSignalsFromGithubWorkflows(@TempDir Path repo) throws IOException {
        write(repo, ".github/workflows/ci.yml", """
                name: CI
                jobs:
                  build:
                    steps:
                      - run: npm run build
                      - run: npm test
                      - run: npm run lint
                      - run: tsc --noEmit
                      - run: npm run coverage
                """);

        Map<String, Object> all = StaticHeuristicsScanner.scan(repo);
        Map<String, Object> testing = asMap(all.get("testing"));
        Map<String, Object> entryPoints = asMap(all.get("entry_points"));

        assertThat(testing).containsKeys("ci_configured", "ci_runs_tests", "ci_runs_lint",
                "ci_runs_typecheck", "coverage_config");
        assertThat(entryPoints).containsKeys("ci_has_build", "ci_has_test");
    }

    @Test
    void readsSecurityHygieneFromGitignoreAndPolicyFiles(@TempDir Path repo) throws IOException {
        write(repo, ".gitignore", """
                node_modules/
                .env
                *.pem
                secrets/
                """);
        write(repo, "SECURITY.md", "# Security policy\n");
        write(repo, ".github/dependabot.yml", "version: 2\n");
        write(repo, ".gitleaks.toml", "[allowlist]\n");

        Map<String, Object> security = asMap(StaticHeuristicsScanner.scan(repo).get("security"));

        assertThat(security).containsKeys("gitignore", "gitignore_covers_env",
                "gitignore_covers_secrets", "security_policy", "has_dep_updates", "gitleaks");
        // All six security signals → the full 10.
        assertThat(LegibilitySignalScorer.score("security", security).score()).isEqualTo(10.0);
    }

    @Test
    void readsDocumentationAndArchitectureSignposts(@TempDir Path repo) throws IOException {
        write(repo, "README.md", "# P\n- [Intro](#intro)\n![badge](https://shields.io/x)\n");
        write(repo, "AGENTS.md", "# Agent guide\n");
        write(repo, "CONTRIBUTING.md", "# Contributing\n");
        write(repo, "CHANGELOG.md", "# Changelog\n");
        write(repo, "CODE_OF_CONDUCT.md", "# CoC\n");
        write(repo, "LICENSE", "MIT\n");
        write(repo, "ARCHITECTURE.md", "# Architecture\n");
        write(repo, "docs/openapi.yaml", "openapi: 3.1.0\n");
        write(repo, "src/main.ts", "export {};\n");

        Map<String, Object> all = StaticHeuristicsScanner.scan(repo);
        Map<String, Object> documentation = asMap(all.get("documentation"));
        Map<String, Object> architecture = asMap(all.get("architecture"));

        assertThat(documentation).containsKeys("agents_md", "contributing", "changelog",
                "code_of_conduct", "license", "docs_directory", "readme_has_badges",
                "readme_has_toc", "api_docs");
        assertThat(architecture).containsKeys("architecture_md", "has_src_dir");
    }

    @Test
    void detectsAMavenStyleTestLayout(@TempDir Path repo) throws IOException {
        write(repo, "pom.xml", "<project/>");
        write(repo, "src/test/java/AppTest.java", "class AppTest {}");

        Map<String, Object> testing = asMap(StaticHeuristicsScanner.scan(repo).get("testing"));

        assertThat(testing).containsKey("has_test_dir");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        assertThat(value).isInstanceOf(Map.class);
        return (Map<String, Object>) value;
    }

    private static void write(Path root, String relative, String content) throws IOException {
        Path file = root.resolve(relative);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }
}
