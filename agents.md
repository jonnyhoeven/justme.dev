# AI Agent Workflow Guide

This document defines the mandatory development practices for AI agents working on **justme.dev**.

## 🚀 Mandatory Linting & Formatting

To maintain codebase health, all agents **MUST** ensure changes pass the following checks before completion:

1. **Pre-commit Hooks**:
   - Always run `pre-commit run --all-files` to verify all automated checks (trailing whitespace, EOF, YAML, ESLint, Prettier, Ruff).
   - Never use `--no-verify` to bypass these checks.

2. **Python Quality (Ruff)**:
   - All Python code in `scripts/` and `tests/` must pass Ruff linting.
   - Run `ruff check . --fix` to automatically address common issues.
   - Configuration is located in `pyproject.toml`.

3. **Web Quality (ESLint/Prettier)**:
   - All Vue/TypeScript/CSS code must pass ESLint and Prettier.
   - Use `npm run lint` and `npm run format`.

## 📂 Structural Guardrails

- **Generated Content**: Do not edit files in `projects/*.md`. Always modify the source in `requests/*.yaml` or the ETL script in `scripts/`.
- **Nix Environment**: Always operate within the Nix DevShell provided by `flake.nix`.
- **Canvas Animations**: Always use `IntersectionObserver` for Canvas animations. Ensure animations are paused when the canvas is out of the viewport to prevent unnecessary CPU/GPU usage.

## 🛠 Operational Rules

1. **Fix Regressions**: If lint or format commands reveal errors (especially those introduced by your changes), fix them immediately.
2. **No Direct Output Edits**: Never modify generated files directly.
3. **Documentation Continuity**: Always ensure `GEMINI.md` and `agents.md` are updated if there are changes to commands or core architecture.
