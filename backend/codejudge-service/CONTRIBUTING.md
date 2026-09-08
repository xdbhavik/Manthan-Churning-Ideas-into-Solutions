# Contributing to Agentic Legibility Score

Thanks for considering a contribution! This project improves how AI agents interact with codebases — every improvement here multiplies across every repo that gets scored.

## How to Contribute

### Reporting Issues

- Open an issue describing the problem, the repo you scanned, and what you expected vs. what happened
- Include the scanner JSON output if relevant (redact sensitive paths)

### Adding Detection Signals

The scanner (`scripts/scan_repo.py`) is organized by category. Each `scan_*` function returns a dict of signals.

To add a new signal:

1. Find the relevant `scan_*` function
2. Add your detection logic
3. Return the result in the signals dict
4. Update `references/scoring-rubric.md` if the signal affects scoring
5. Test against at least 2 repos (one where the signal is present, one where it's absent)

### Improving the Rubric

`references/scoring-rubric.md` defines the point values and criteria. Changes here affect every score.

- Keep criteria objectively measurable where possible
- Justify point values with real agent failure modes
- Maintain the total at 100 points across the 7 categories

### Updating the Skill

`SKILL.md` is the agent-facing interface. Changes should:

- Keep it as concise as possible (context window is a shared resource)
- Preserve the two-pass workflow (scanner baseline → qualitative assessment)
- Preserve the scorecard output format for consistency
- Test with an actual AI agent if possible

## Development

### Running the Scanner

```bash
python3 scripts/scan_repo.py /path/to/repo
```

Runtime has no external dependencies — the scanner itself uses the standard library only.

For maintainer workflows, install the lightweight dev tools used in CI:

```bash
python3 -m pip install build ruff
```

### Validating Changes

```bash
python3 -m ruff check .
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/scan_repo.py . | python3 -m json.tool > /dev/null
python3 -m build
```

These four commands cover linting, tests, self-scan validation, and package build verification without requiring a task runner.

## Code Style

- Python 3.9+ compatible
- Standard library only — no external dependencies
- Functions return dicts, not print output
- Keep scanner functions focused: one function per category

## Pull Request Process

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Test against multiple repo types (JS, Python, Rust, Go, etc.)
4. Update docs if you changed scoring or detection
5. Open a PR with a description of what changed and why

## Design Principles

- **Zero dependencies** — The scanner must run anywhere Python 3.9+ exists
- **Mechanical first** — Prefer signals that can be detected automatically
- **Failure-mode driven** — Every criterion should trace to a real agent failure
- **Progressive disclosure** — SKILL.md is concise; details live in references/
