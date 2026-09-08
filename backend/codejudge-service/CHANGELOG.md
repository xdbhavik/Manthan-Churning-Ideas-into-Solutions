# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed
- Packaging now ships the installable scanner module so the `agentic-legibility-score` CLI works after installation
- `pyproject.toml` uses SPDX-style license metadata to avoid setuptools deprecation warnings

### Added
- Regression tests covering core scanner output and CLI wrappers
- GitHub Actions CI for tests, packaging, and self-scan validation
- Dependabot configuration for Python and GitHub Actions updates
- SECURITY.md with a vulnerability reporting path
- Visual repo hero asset and a docs quickstart page for copy-paste install paths
- EditorConfig plus clearer documented contributor validation commands and repo conventions

### Changed
- Expanded scanner coverage for additional project layouts, command conventions, test-project patterns, and analyzer signals across more ecosystems
- README now leads with a sharper value proposition, direct CLI install path, and clearer proof/demo links
- CI now runs Ruff lint in addition to tests, self-scan validation, and package builds

## [1.0.0] - 2026-04-07

### Added
- Initial release
- Repository scanner (`scripts/scan_repo.py`) detecting 90+ signals across 7 categories
- Scoring rubric (`references/scoring-rubric.md`) with full/partial/zero credit definitions
- Agent skill (`SKILL.md`) with formatted scorecard output
- Categories: Bootstrap, Entry Points, Documentation, Architecture, Testing, Code Quality, Security
- Grade scale A+ through F- with agent capability descriptions
- Two-pass scoring: mechanical scanner baseline + LLM qualitative assessment per category
- Support for: JavaScript/TypeScript, Python, Rust, Go, Ruby, Java, and more
- Detection of 15+ linter/formatter configs, 8+ CI systems, 12+ package managers
