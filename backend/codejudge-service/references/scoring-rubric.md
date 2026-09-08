# Scoring Rubric — Agentic Legibility Score

Detailed scoring criteria for each category. Each sub-criterion is scored 0 (absent), partial, or full points.

---

## Category 1: Bootstrap & Environment (15 pts)

> "Can an agent enter this repo, set up the environment, and start working without tribal knowledge?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Setup Documentation** | 5 | README has clear install/setup section with copy-pasteable commands | README exists but setup steps are vague or incomplete | No README or no setup instructions |
| **Dev Environment Config** | 5 | Has devcontainer OR docker-compose OR Nix config AND .env.example | Has Dockerfile or partial env docs | No containerization or env documentation |
| **Dependency Management** | 5 | Lockfile present AND package manifest exists AND Makefile/task runner | Lockfile + manifest but no task runner | No lockfile or no manifest |

### Scoring Logic
- `readme_exists` + `readme_has_setup` + `readme_has_commands` → Setup Documentation
- `devcontainer` OR `docker_compose` OR `nix_config` + `env_example` → Dev Environment
- `lockfile` + `package_manifest` + `makefile` → Dependency Management

---

## Category 2: Entry Points & Commands (15 pts)

> "Can an agent find the build, test, and lint commands without guessing?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Build Discoverable** | 5 | Build command in package.json/Makefile/pyproject AND documented in README | Build exists in config but not documented | No build command found |
| **Test Discoverable** | 5 | Test command in package.json/Makefile/pyproject AND documented | Test exists in config but not documented | No test command found |
| **Lint/Format Discoverable** | 5 | Lint + format commands in config AND documented | One of lint/format configured | Neither configured |

### Key Check
- npm scripts → `build`, `test`, `lint`, `format`
- Makefile targets → `build`, `test`, `lint`, `fmt`
- pyproject.toml → pytest/ruff/mypy configuration
- CI files validate these commands actually run

---

## Category 3: Documentation & Navigation (20 pts)

> "Is there a map of the repo? Can the agent find its way around?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Agent Guide** | 5 | AGENTS.md or copilot-instructions.md exists with repo-specific guidance | Generic agent instructions | No agent-specific docs |
| **README Quality** | 5 | README has: overview, setup, architecture summary, ≥5 headings, code examples | README exists with basic info but gaps | Minimal or no README |
| **Docs Structure** | 5 | docs/ directory with ≥3 files AND cross-linking between docs | docs/ exists with some files | No docs directory |
| **Contributing Guide** | 5 | CONTRIBUTING.md with workflow, standards, PR process | CONTRIBUTING.md exists but minimal | No contributing guide |

### README Quality Signals
- `readme_length` > 2000 chars → substantive
- `readme_heading_count` ≥ 5 → well-structured
- `readme_code_blocks` ≥ 2 → has examples
- `readme_has_toc` → navigable

### AGENTS.md Best Practice (from OpenAI Harness)
- Should be ~100 lines (table of contents, not encyclopedia)
- Points to deeper docs via progressive disclosure
- Contains repo map, key commands, conventions

---

## Category 4: Architecture & Structure (15 pts)

> "Does the agent understand why the system looks the way it does?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Architecture Docs** | 5 | ARCHITECTURE.md or docs/architecture.md with domain map, layer descriptions | Mentions architecture in README | No architecture documentation |
| **Decision Records** | 5 | ADR directory with ≥2 records OR design-docs directory | Some design rationale in docs | No ADRs or design docs |
| **Code Organization** | 5 | Clear src/lib/app structure AND ≤20 top-level items AND logical separation | Has source directory but cluttered top-level | Flat structure, no clear organization |

### Architecture Signals (from Harness Engineering)
- Layered domain architecture with validated dependency directions
- Cross-cutting concerns through explicit interfaces
- Quality scores tracked per domain (QUALITY_SCORE.md)
- Execution plans as first-class artifacts

---

## Category 5: Testing & Validation (15 pts)

> "Can the agent verify changes are correct without waiting for a human?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Test Presence** | 5 | Test directory + ≥10 test files + test runner configured | Some test files exist | No tests found |
| **CI/CD Pipeline** | 5 | CI configured AND runs tests AND runs linting | CI exists but limited coverage | No CI configured |
| **Coverage & E2E** | 5 | Coverage config + E2E test setup (Playwright/Cypress) | Coverage OR E2E (one of two) | Neither coverage nor E2E |

### Validation Harness (from seand.ai)
- Agent must be able to run tests locally
- CI should catch issues before human review
- Clear pass/fail signals, not ambiguous output

---

## Category 6: Code Quality Enforcement (10 pts)

> "Are linting and formatting easy to discover and run?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Linting** | 3 | Linter configured (ESLint/Biome/Ruff/Clippy) with config file | Linter in devDeps but no config | No linter |
| **Formatting** | 3 | Formatter configured (Prettier/Biome/editorconfig) | Only .editorconfig | No formatting config |
| **Pre-commit Hooks** | 2 | Git hooks configured (Husky/pre-commit/lefthook) with lint-staged | Hooks exist but not comprehensive | No git hooks |
| **Type Checking** | 2 | Type checker configured (TS strict/mypy/pyright) | Type checker present but not strict | No type checking |

### Key Principle
- Linter error messages should inject remediation instructions (from Harness)
- Pre-commit hooks = instant feedback vs. CI wait
- Strict mode catches more errors agent would otherwise miss

---

## Category 7: Security & Governance (10 pts)

> "Will the agent avoid introducing vulnerabilities or exposing secrets?"

| Sub-criterion | Points | Full Credit | Partial Credit | Zero |
|---|---|---|---|---|
| **Secrets Management** | 3 | .gitignore covers .env + secrets + keys | .gitignore exists but incomplete | No .gitignore |
| **Dependency Updates** | 3 | Dependabot/Renovate configured | Manual but documented process | No dependency update process |
| **Review Process** | 2 | CODEOWNERS + PR template + issue templates | Some review artifacts | No review process artifacts |
| **Security Policy** | 2 | SECURITY.md + security scanning (Snyk/Trivy/Gitleaks) | SECURITY.md OR scanning (one) | Neither |

---

## Grade Scale

| Score | Grade | Label | Agent Capability |
|---|---|---|---|
| 90-100 | A+ | Exemplary | Full autonomous operation — agents can independently develop features, fix bugs, and ship changes |
| 80-89 | A | Excellent | High autonomy — agents handle most tasks with minimal guidance |
| 70-79 | B | Strong | Moderate autonomy — agents can do routine work but need guidance for complex tasks |
| 60-69 | C | Adequate | Limited autonomy — agents can do basic maintenance (deps, simple fixes) |
| 40-59 | D | Developing | Minimal autonomy — agents frequently stall or make mistakes |
| 20-39 | F | Poor | Agents mostly unable to operate — constant human intervention required |
| 0-19 | F- | Critical | Repository is effectively opaque to agents |

---

## Qualitative Second Pass

The scanner uses hardcoded keywords and patterns. It will miss non-standard tooling, custom build systems, and quality that only shows up in file contents. After computing mechanical scores, **read the actual repo** and adjust each category as needed.

### When to Upgrade a Category Score

- Scanner missed signals due to non-standard tooling (e.g., `build.zig` instead of `Makefile`, `deno.json` instead of `package.json`, `Earthfile` instead of `Dockerfile`)
- File contents show quality the scanner cannot assess (e.g., README uses unfamiliar commands but explains them clearly, CI runs comprehensive checks through a custom script)
- Documentation reads as a useful "map" with progressive disclosure, not just boilerplate
- Error messages in CI/linters contain remediation instructions that guide agents
- Repo has a quality tracking system (QUALITY_SCORE.md or equivalent)

### When to Downgrade a Category Score

- Scanner found files that are actually empty, boilerplate, stale, or misleading (e.g., `CONTRIBUTING.md` that says "TBD", test files with no real assertions, disabled CI)
- Critical knowledge lives outside the repo (Notion, Slack, Google Docs, tribal knowledge)
- Undocumented environment variables, magic commands, or setup steps that require asking a human
- Significant architectural drift — inconsistent patterns suggest no enforced conventions
- Documentation exists but contradicts actual repo behavior (stale docs are worse than no docs)
