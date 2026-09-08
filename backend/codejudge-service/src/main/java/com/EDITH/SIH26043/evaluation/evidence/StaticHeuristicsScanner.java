package com.EDITH.SIH26043.evaluation.evidence;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Built-in static heuristic marker used when the Python agentic-legibility
 * analyzer is unavailable (no Python, missing script, timeout). It produces the
 * SAME boolean/count signal keys under the same category names the analyzer
 * emits, so {@link com.EDITH.SIH26043.evaluation.scoring.LegibilitySignalScorer}
 * scores a fallback row exactly like a real analyzer row — only with tool
 * {@code HEURISTIC_FALLBACK}.
 *
 * <p>This is deliberately shallow: it inspects top-level files plus a small set
 * of well-known paths (README, package.json, .github/workflows, docs) and never
 * executes anything. A repo that is well sign-posted scores; a bare code dump
 * scores low — the same signal the analyzer reads, just from fewer heuristics.</p>
 */
public final class StaticHeuristicsScanner {

    private static final int MAX_READ_BYTES = 200_000;

    private StaticHeuristicsScanner() {
    }

    public static Map<String, Object> scan(Path root) {
        List<Path> topLevel = listTopLevel(root);
        Set<String> names = new LinkedHashSet<>();
        List<Path> readmeCandidates = new ArrayList<>();
        for (Path p : topLevel) {
            String n = fileName(p).toLowerCase(Locale.ROOT);
            names.add(n);
            if (p.getFileName() != null) {
                String raw = p.getFileName().toString().toLowerCase(Locale.ROOT);
                if (raw.startsWith("readme")) {
                    readmeCandidates.add(p);
                }
            }
        }

        String readme = readFirst(readmeCandidates);
        String gitignore = readNamed(topLevel, ".gitignore");
        String securityMd = readNamed(topLevel, "security.md");
        String contributing = readFirstNamed(topLevel, "contributing");
        String codeOfConduct = readFirstNamed(topLevel, "code_of_conduct");
        String license = readFirstNamed(topLevel, "license");
        String changelog = readFirstNamed(topLevel, "changelog");
        String agentsMd = readFirstNamed(topLevel, "agents.md");
        String claudeMd = readFirstNamed(topLevel, "claude.md");
        String architectureMd = readFirstNamed(topLevel, "architecture.md");
        String packageJson = readNamed(topLevel, "package.json");
        String envExample = hasAnyFile(topLevel, ".env.example", ".env.sample") ? "# present" : null;
        String workflows = readWorkflows(topLevel);

        boolean hasSrcDir = hasDirectory(root, "src");
        boolean hasDocsDir = hasDirectory(root, "docs");
        boolean hasTestDir = hasDirectory(root, "test", "tests", "spec") || hasSrcTest(topLevel);

        Map<String, Object> bootstrap = new HashMap<>();
        putTrue(bootstrap, "readme_exists", readme != null);
        putTrue(bootstrap, "readme_has_setup", containsAny(readme, "setup", "installation", "install", "getting started", "get started"));
        putTrue(bootstrap, "readme_has_commands", containsAny(readme, "npm install", "pip install", "mvn ", "mvnw ", "gradle", "go run", "docker compose", "docker-compose", "yarn install", "pnpm install"));
        putTrue(bootstrap, "env_example", envExample != null);
        putTrue(bootstrap, "devcontainer", hasDirectory(root, ".devcontainer") || hasAnyFile(topLevel, "devcontainer.json"));
        putTrue(bootstrap, "docker_compose", hasAnyFile(topLevel, "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"));
        putTrue(bootstrap, "dockerfile", hasAnyFile(topLevel, "dockerfile"));
        putTrue(bootstrap, "lockfile", hasAnyFile(topLevel,
                "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
                "pipfile.lock", "cargo.lock", "go.sum", "composer.lock", "gemfile.lock"));
        putTrue(bootstrap, "package_manifest", hasAnyFile(topLevel,
                "package.json", "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle",
                "pyproject.toml", "requirements.txt", "go.mod", "cargo.toml", "setup.py", "gemfile"));
        putTrue(bootstrap, "makefile", hasAnyFile(topLevel, "makefile"));

        Map<String, Object> entryPoints = new HashMap<>();
        String pkgScripts = extractJsonBlock(packageJson, "scripts");
        putTrue(entryPoints, "has_build_script", containsAny(pkgScripts, "\"build\"", "\"compile\"", "\"start\"")
                || hasAnyFile(topLevel, "pom.xml", "build.gradle", "makefile", "build.sh"));
        putTrue(entryPoints, "has_test_script", containsAny(pkgScripts, "\"test\"")
                || hasAnyFile(topLevel, "pom.xml", "build.gradle", "makefile", "tox.ini"));
        putTrue(entryPoints, "has_lint_script", containsAny(pkgScripts, "\"lint\"")
                || hasAnyFile(topLevel, ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", ".pylintrc", ".rubocop.yml"));
        putTrue(entryPoints, "has_format_script", containsAny(pkgScripts, "\"format\"", "\"fmt\"")
                || hasAnyFile(topLevel, ".prettierrc", ".prettierrc.json", ".editorconfig"));
        putTrue(entryPoints, "has_dev_script", containsAny(pkgScripts, "\"dev\"", "\"serve\"", "\"develop\""));
        putTrue(entryPoints, "ci_has_build", workflows != null && containsAny(workflows, "run:", "build"));
        putTrue(entryPoints, "ci_has_test", workflows != null
                && containsAny(workflows, "npm test", "yarn test", "pnpm test", "mvn test", "gradle test", "pytest", "go test", "cargo test"));

        Map<String, Object> documentation = new HashMap<>();
        putTrue(documentation, "agents_md", agentsMd != null || claudeMd != null);
        putTrue(documentation, "contributing", contributing != null);
        putTrue(documentation, "changelog", changelog != null);
        putTrue(documentation, "code_of_conduct", codeOfConduct != null);
        putTrue(documentation, "license", license != null);
        putTrue(documentation, "docs_directory", hasDocsDir);
        putTrue(documentation, "readme_has_badges", readme != null
                && (readme.contains("shields.io") || readme.contains("![") || readme.contains("badge")));
        putTrue(documentation, "readme_has_toc", readme != null && (readme.contains("- [") || readme.contains("* [")));
        putTrue(documentation, "api_docs", findFilesNamed(root, topLevel,
                "openapi", "swagger", "api-docs", "redoc", ".graphql", "grpc").length > 0);
        putTrue(documentation, "typedoc_or_jsdoc", hasAnyFile(topLevel, "typedoc.json", "jsdoc.json", "tsconfig.doc.json")
                || containsAny(packageJson, "typedoc", "jsdoc"));

        Map<String, Object> architecture = new HashMap<>();
        putTrue(architecture, "architecture_md", architectureMd != null || hasDocsFileNamed(root, "architecture"));
        putTrue(architecture, "has_adrs", hasDirectory(root, "adr", "decisions", "docs/adr"));
        putTrue(architecture, "has_design_docs", hasDocsDir);
        putTrue(architecture, "has_exec_plans", hasDocsFileNamed(root, "plan", "roadmap"));
        putTrue(architecture, "has_src_dir", hasSrcDir);
        putTrue(architecture, "is_monorepo", hasDirectory(root, "packages") || hasDirectory(root, "apps")
                || containsAny(packageJson, "\"workspaces\""));

        Map<String, Object> testing = new HashMap<>();
        putTrue(testing, "has_test_dir", hasTestDir);
        putTrue(testing, "ci_configured", hasDirectory(root, ".github")
                || hasAnyFile(topLevel, ".gitlab-ci.yml", ".travis.yml", "azure-pipelines.yml", "circleci", "jenkinsfile"));
        putTrue(testing, "ci_runs_tests", workflows != null
                && containsAny(workflows, "npm test", "yarn test", "pnpm test", "mvn test", "gradle test", "pytest", "go test", "cargo test"));
        putTrue(testing, "ci_runs_lint", workflows != null && containsAny(workflows, "lint", "eslint", "checkstyle"));
        putTrue(testing, "ci_runs_typecheck", workflows != null && containsAny(workflows, "tsc", "typecheck"));
        putTrue(testing, "jest_config", containsAny(packageJson, "\"jest\"")
                || hasAnyFile(topLevel, "jest.config.js", "jest.config.ts", "jest.config.json"));
        putTrue(testing, "vitest_config", hasAnyFile(topLevel, "vitest.config.ts", "vitest.config.js", "vite.config.ts")
                && containsAny(packageJson, "vitest"));
        putTrue(testing, "pytest_config", hasAnyFile(topLevel, "pytest.ini", "conftest.py", "tox.ini")
                || containsAny(packageJson, "pytest") || containsAny(readFileIfExists(root, "pyproject.toml"), "[tool.pytest"));
        putTrue(testing, "playwright_config", hasAnyFile(topLevel, "playwright.config.ts", "playwright.config.js"));
        putTrue(testing, "cypress_config", hasDirectory(root, "cypress") || hasAnyFile(topLevel, "cypress.config.js", "cypress.config.ts"));
        putTrue(testing, "coverage_config", containsAny(pkgScripts, "coverage") || containsAny(workflows, "coverage"));

        Map<String, Object> codeQuality = new HashMap<>();
        putTrue(codeQuality, "has_linter", hasAnyFile(topLevel,
                ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", ".eslintignore",
                ".pylintrc", "checkstyle.xml", "pmd.xml", ".rubocop.yml", ".ruff.toml", "biome.json")
                || containsAny(packageJson, "eslint", "checkstyle", "pylint", "biome"));
        putTrue(codeQuality, "has_formatter", hasAnyFile(topLevel,
                ".prettierrc", ".prettierrc.json", ".prettierrc.yaml", ".editorconfig", ".rubocop.yml")
                || containsAny(packageJson, "prettier"));
        putTrue(codeQuality, "has_typecheck", hasAnyFile(topLevel, "tsconfig.json") || containsAny(pkgScripts, "typecheck", "tsc"));
        putTrue(codeQuality, "has_git_hooks", hasDirectory(root, ".husky")
                || hasDirectory(root, ".githooks", ".git-hooks")
                || hasAnyFile(topLevel, ".pre-commit-config.yaml")
                || containsAny(packageJson, "lint-staged", "husky"));

        Map<String, Object> security = new HashMap<>();
        putTrue(security, "gitignore", gitignore != null);
        putTrue(security, "gitignore_covers_env", gitignore != null && gitignore.toLowerCase(Locale.ROOT).contains(".env"));
        putTrue(security, "gitignore_covers_secrets", gitignore != null && containsAny(gitignore.toLowerCase(Locale.ROOT),
                "secret", "private", "id_rsa", "credentials", ".pem", "keystore", "token"));
        putTrue(security, "has_dep_updates", hasAnyFile(root, ".github/dependabot.yml", ".github/dependabot.yaml")
                || hasAnyFile(topLevel, "dependabot.yml", "renovate.json", ".renovaterc.json"));
        putTrue(security, "security_policy", securityMd != null);
        putTrue(security, "gitleaks", hasAnyFile(topLevel, ".gitleaks.toml", ".gitleaksignore", "gitleaks.toml"));

        Map<String, Object> result = new HashMap<>();
        result.put("bootstrap", bootstrap);
        result.put("entry_points", entryPoints);
        result.put("documentation", documentation);
        result.put("architecture", architecture);
        result.put("testing", testing);
        result.put("code_quality", codeQuality);
        result.put("security", security);
        return result;
    }

    // -- helpers ------------------------------------------------------------

    private static void putTrue(Map<String, Object> map, String key, boolean value) {
        if (value) {
            map.put(key, true);
        }
    }

    private static boolean containsAny(String text, String... needles) {
        if (text == null) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        for (String n : needles) {
            if (lower.contains(n.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static List<Path> listTopLevel(Path root) {
        List<Path> entries = new ArrayList<>();
        if (root == null || !Files.isDirectory(root)) {
            return entries;
        }
        try (Stream<Path> stream = Files.list(root)) {
            stream.forEach(entries::add);
        } catch (IOException ignored) {
            // ignore unreadable dirs
        }
        return entries;
    }

    private static String fileName(Path p) {
        return p.getFileName() == null ? "" : p.getFileName().toString();
    }

    private static boolean hasDirectory(Path root, String... dirs) {
        for (String d : dirs) {
            Path target = root.resolve(d);
            if (Files.isDirectory(target)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasSrcTest(List<Path> topLevel) {
        for (Path p : topLevel) {
            if ("src".equalsIgnoreCase(fileName(p)) && Files.isDirectory(p)) {
                Path test = p.resolve("test");
                Path testDir = p.resolve("test").resolve("java");
                if (Files.isDirectory(testDir) || Files.isDirectory(test)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean hasAnyFile(Path root, String... names) {
        for (String n : names) {
            if (Files.isRegularFile(root.resolve(n))) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasAnyFile(List<Path> topLevel, String... names) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String n : names) {
            normalized.add(n.toLowerCase(Locale.ROOT));
        }
        for (Path p : topLevel) {
            if (normalized.contains(fileName(p).toLowerCase(Locale.ROOT)) && Files.isRegularFile(p)) {
                return true;
            }
        }
        return false;
    }

    private static String readNamed(List<Path> topLevel, String name) {
        for (Path p : topLevel) {
            if (Files.isRegularFile(p) && name.equalsIgnoreCase(fileName(p))) {
                return readFile(p);
            }
        }
        return null;
    }

    private static String readFileIfExists(Path root, String name) {
        Path p = root.resolve(name);
        return Files.isRegularFile(p) ? readFile(p) : null;
    }

    private static String readFirst(List<Path> candidates) {
        for (Path p : candidates) {
            if (Files.isRegularFile(p)) {
                String content = readFile(p);
                if (content != null) {
                    return content;
                }
            }
        }
        return null;
    }

    private static String readFirstNamed(List<Path> topLevel, String prefix) {
        for (Path p : topLevel) {
            if (Files.isRegularFile(p) && fileName(p).toLowerCase(Locale.ROOT).startsWith(prefix)) {
                return readFile(p);
            }
        }
        return null;
    }

    private static String readWorkflows(List<Path> topLevel) {
        Path wfDir = null;
        for (Path p : topLevel) {
            if (Files.isDirectory(p) && ".github".equalsIgnoreCase(fileName(p))) {
                Path workflows = p.resolve("workflows");
                if (Files.isDirectory(workflows)) {
                    wfDir = workflows;
                }
                break;
            }
        }
        if (wfDir == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        try (Stream<Path> stream = Files.list(wfDir)) {
            stream.filter(Files::isRegularFile).limit(20)
                    .forEach(f -> sb.append(readFile(f)));
        } catch (IOException ignored) {
            // ignore
        }
        return sb.toString();
    }

    private static Path[] findFilesNamed(Path root, List<Path> topLevel, String... fragments) {
        List<Path> found = new ArrayList<>();
        for (Path p : topLevel) {
            String n = fileName(p).toLowerCase(Locale.ROOT);
            for (String f : fragments) {
                if (n.contains(f.toLowerCase(Locale.ROOT))) {
                    found.add(p);
                    break;
                }
            }
        }
        Path docs = root.resolve("docs");
        if (Files.isDirectory(docs)) {
            try (Stream<Path> stream = Files.list(docs)) {
                stream.filter(Files::isRegularFile).limit(50).forEach(p -> {
                    String n = fileName(p).toLowerCase(Locale.ROOT);
                    for (String f : fragments) {
                        if (n.contains(f.toLowerCase(Locale.ROOT))) {
                            found.add(p);
                            break;
                        }
                    }
                });
            } catch (IOException ignored) {
                // ignore
            }
        }
        return found.toArray(Path[]::new);
    }

    private static boolean hasDocsFileNamed(Path root, String... fragments) {
        return findFilesNamed(root, listTopLevel(root), fragments).length > 0;
    }

    private static String readFile(Path p) {
        try {
            if (Files.size(p) > MAX_READ_BYTES) {
                return null;
            }
            return Files.readString(p, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    /** Very light JSON block grabber: returns the text between "scripts" : { … }. */
    private static String extractJsonBlock(String json, String key) {
        if (json == null) {
            return null;
        }
        String marker = "\"" + key + "\"";
        int idx = json.indexOf(marker);
        if (idx < 0) {
            return null;
        }
        int open = json.indexOf('{', idx);
        if (open < 0) {
            return null;
        }
        int close = findJsonEnd(json, open);
        return close > open ? json.substring(open, close + 1) : null;
    }

    private static int findJsonEnd(String text, int openBrace) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = openBrace; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
            } else if (c == '"') {
                inString = true;
            } else if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }
}
