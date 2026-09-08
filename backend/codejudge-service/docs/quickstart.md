# Agentic Legibility Score Quickstart

This page gives the fastest copy-paste path for the three main ways to use the project.

## Option 1: Install as an AI agent skill

```bash
npx skills add LatencyTDH/agentic-legibility
```

Then ask your agent:

> Score this repo on agentic legibility

Use this path when you want the **full two-pass workflow**:

1. Mechanical scanner baseline
2. Qualitative repo reading by the agent
3. Final scorecard with recommendations

## Option 2: Install the standalone CLI directly from GitHub

```bash
python3 -m pip install "git+https://github.com/LatencyTDH/agentic-legibility.git"
agentic-legibility-score /path/to/repo > legibility.json
```

Use this path when you want quick JSON output without cloning the repo first.

## Option 3: Clone and run locally

```bash
git clone https://github.com/LatencyTDH/agentic-legibility.git
cd agentic-legibility
python3 scripts/scan_repo.py /path/to/repo
```

Use this path when you want to inspect or modify the scanner itself.

## Contributor setup

```bash
git clone https://github.com/LatencyTDH/agentic-legibility.git
cd agentic-legibility
python3 -m pip install build ruff
python3 -m ruff check .
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m build
python3 scripts/scan_repo.py . | python3 -m json.tool > /dev/null
```

## Common workflows

### Audit your own repo before enabling coding agents

```bash
agentic-legibility-score /path/to/your/repo > legibility.json
```

Then use `references/scoring-rubric.md` to turn the raw signals into a final score.

### Benchmark improvements over time

Run the scanner before and after changes to docs, setup, CI, or architecture notes. The fastest wins usually come from:

- Explicit setup instructions
- Clear build/test/lint commands
- Better repo maps (`README`, `AGENTS.md`, `docs/`)
- Stronger validation harnesses and CI

### Use the skill for the high-context pass

The scanner is intentionally mechanical. For the most accurate score, run the skill so the agent can read the repo and adjust for non-standard tooling or stale docs.
