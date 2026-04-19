---
name: justme.dev
type: VitePress + Python ETL Documentation Portal
primary_language: TypeScript / Python
tech_stack:
  frontend: VitePress (Vue 3), Vanilla CSS, VueUse
  backend: Python 3 ETL Pipeline (Ruff for linting/formatting)
  hosting: GitHub Pages
source_of_truth: requests/*.yaml (projects), .vitepress/config.mts (site config)
generated_artifacts: projects/*.md, public/projects-cache/
---

# GEMINI.md - AI Context & Developer Operations

This file provides a consolidated overview of the **justme.dev** project for AI assistants and developers. It defines the project's purpose, architecture, and operational commands.

## 🚀 Quick Description

**justme.dev** is a cloud-native documentation architecture that aggregates content from various GitHub repositories using a custom Python ETL pipeline. It is built on **VitePress** and deployed as a serverless static site on GitHub Pages.

---

## 🛠 Key Commands (from `package.json`)

| Purpose              | Command                        | Description                                                            |
| :------------------- | :----------------------------- | :--------------------------------------------------------------------- |
| **Development**      | `npm run docs:dev`             | Start VitePress dev server with Hot Module Replacement (HMR).          |
| **ETL (Content)**    | `npm run docs:generate`        | Run Python script (via Nix Python) to fetch/transform remote markdown. |
| **ETL (Splats)**     | `npm run docs:generate-splats` | Generate/process splat-related assets.                                 |
| **Build**            | `npm run docs:build`           | Compile static site for production.                                    |
| **Preview**          | `npm run docs:preview`         | Locally preview the production build.                                  |
| **Linting (JS/Vue)** | `npm run lint`                 | Run ESLint with auto-fix enabled.                                      |
| **Formatting (Web)** | `npm run format`               | Run Prettier to format all files.                                      |
| **Linting (Python)** | `ruff check . --fix`           | Run Ruff to lint and fix Python scripts.                               |
| **Pre-commit**       | `pre-commit run --all-files`   | Manually run all hooks on all files.                                   |

---

## 🏗 Architecture & Tech Stack

```mermaid
graph TD
    A[requests/*.yaml] -->|ETL: scripts/process_requests.py| B[projects/*.md]
    B -->|VitePress Build| C[GitHub Pages Static Site]
    D[External Repositories] -->|Fetch README/Metadata| A
    E[.vitepress/config.mts] -->|Site Structure| C
    F[components/*.vue] -->|Custom UI| C
```

### Technical Pillars

- **Framework**: VitePress (Vue.js 3 ecosystem).
- **Styling**: Vanilla CSS (Strictly avoid Tailwind unless explicitly requested).
- **Automation**: GitHub Actions (`.github/workflows/deploy.yml`) for automated builds.
- **Data Flow**: Python scripts (`scripts/`) transform raw YAML manifestations into static Markdown content.

---

## 💡 AI Implementation Guide

### 📂 Critical Project Structure

| Path          | Role                               | AI Interaction                                          |
| :------------ | :--------------------------------- | :------------------------------------------------------ |
| `requests/`   | Source manifests for projects.     | Edit these to add/modify external project sources.      |
| `projects/`   | **Generated** documentation.       | **DO NOT EDIT.** Run `npm run docs:generate` to update. |
| `.vitepress/` | Routing, headers, and theme logic. | Modify `config.mts` for global changes.                 |
| `components/` | Custom Vue components.             | Use these for complex UI interactivity.                 |
| `scripts/`    | ETL and generation logic.          | Update these to change how external data is fetched.    |

### 🛠 Common Workflows

#### 1. Adding a New Project

1. Create a `requests/<name>.yaml` file with the correct metadata.
2. Run `npm run docs:generate`.
3. Check `projects/<name>.md` to verify the output.

#### 2. Modifying Global Theme/Navigation

1. Navigate to `.vitepress/config.mts`.
2. Update the `themeConfig` section.
3. Use `npm run docs:dev` to preview changes in real-time.

#### 3. Styling Changes

1. Go to `.vitepress/theme/custom.css` (or equivalent).
2. Use **Vanilla CSS**. Ensure compatibility with VitePress's default styling.

### ⚠️ Guardrails & "Don'ts"

- **🚫 DON'T** edit files in the `projects/` directory directly. They are overwritten by the ETL script.
- **🚫 DON'T** install new CSS frameworks (Tailwind, UnoCSS) without explicit user permission.
- **🚫 DON'T** bypass the Nix environment. Always ensure `direnv` has loaded the Nix Flake.

---

## 🤖 Operational Rules for AI Agents

To maintain code quality and consistency, all agents **MUST** follow these rules:

1.  **Nix Environment Awareness**: This project uses a Nix Flake + `direnv`. Ensure you have `direnv allow`ed the environment. System dependencies (Node 22, Python, ImageMagick) are managed here.
2.  **Mandatory Cleanup**: Before marking a task as complete, you **MUST** ensure all files pass `pre-commit`. Running `npm run format && npm run lint` is still recommended for speed, but `pre-commit run --all-files` is the definitive check.
3.  **Automated Enforcement**: Pre-commit hooks are installed and will run automatically on `git commit`. Do not bypass them with `--no-verify`.
4.  **Fix Regressions**: If the lint or format commands reveal errors (especially those introduced by your changes), fix them immediately.
5.  **No Direct Output Edits**: Never modify `projects/*.md` files directly. If project content needs changing, update the manifest in `requests/` or the ETL script in `scripts/`.
6.  **Documentation Continuity**: Always ensure `GEMINI.md` is updated if there are changes to commands, schema in `requests/`, or the core architecture.
7.  **IntersectionObserver Optimization**: Always use `IntersectionObserver` for Canvas animations. Ensure animations are paused when the canvas is out of the viewport to prevent unnecessary CPU/GPU usage.
