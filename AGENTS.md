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

# AGENTS.md

**justme.dev** aggregates content from GitHub repositories with a Python ETL pipeline (`requests/*.yaml` → `scripts/process_requests.py` → `projects/*.md`), builds it with VitePress, and deploys a static site to GitHub Pages via `.github/workflows/deploy.yml`.

## Environment

`node`, `pnpm`, Python and ImageMagick come from the Nix flake via `direnv`. If they are not on `PATH`, run `direnv allow` once in the repo root, then prefix commands with `direnv exec . `, e.g. `direnv exec . pnpm run docs:dev` (serves on port 5173). Don't install system tools globally.

## Commands

| Purpose            | Command                                                          |
| :----------------- | :--------------------------------------------------------------- |
| Dev server (HMR)   | `pnpm run docs:dev`                                              |
| ETL: content       | `pnpm run docs:generate`                                         |
| ETL: splat assets  | `pnpm run docs:generate-splats`                                  |
| Build / preview    | `pnpm run docs:build` / `docs:preview`                           |
| Lint / format (JS) | `pnpm run lint` / `pnpm run format`                              |
| Lint (Python)      | `ruff check . --fix`                                             |
| Tests              | `pnpm test` (Vitest, `tests/unit/`), `pnpm run test:py` (pytest) |
| All hooks          | `pre-commit run --all-files`                                     |

## Project structure

| Path                    | Role                                                                                                                                                      |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requests/`             | Source manifests; edit these to add or change external projects.                                                                                          |
| `projects/`             | **Generated. Do not edit**; run `pnpm run docs:generate`.                                                                                                 |
| `scripts/`              | ETL and generation logic.                                                                                                                                 |
| `.vitepress/`           | `config.mts` (global config), `theme/` (`tokens.css`, `layout.css`, `components.css`, `style.css`), `theme/composables/useMusic.ts` (shared music state). |
| `components/`           | Custom Vue components (`HeroSplat.vue`, `MusicEasterEgg.vue`, ...).                                                                                       |
| `lib/audio/`            | XM tracker engine (`xm-player.ts`), mixes `public/audio/*.xm` in a `ScriptProcessorNode`.                                                                 |
| `lib/splat-animations/` | Hero animations; they read `audioData` / `audioLevels` (`audio-utils.ts`).                                                                                |
| `data/`                 | VitePress data loaders (`music.data.ts` lists the tracks).                                                                                                |

**Hero splat + music easter egg:** clicking "it!" in the tagline toggles `MusicEasterEgg.vue`. `XMPlayer` output goes through an `AnalyserNode`; the FFT bins are published via `setAudioData` and `HeroSplat` hands them to the active animation every frame.

## Rules

1. **Never edit `projects/*.md`.** Change the manifest in `requests/` or the ETL script in `scripts/` instead.
2. **Vanilla CSS only.** No Tailwind, UnoCSS or other CSS frameworks without explicit permission. Stay compatible with VitePress default styles.
3. **pnpm v11.** Put `overrides`, `allowBuilds` and workspace settings in `pnpm-workspace.yaml`, never in the `pnpm` field of `package.json` (v11 ignores it).
4. **Canvas animations must pause off-screen.** Use `IntersectionObserver` (or VueUse `useElementVisibility`, which wraps it, as `HeroSplat.vue` does).
5. **Before finishing,** `pre-commit run --all-files` must pass (`pnpm run format && pnpm run lint` and `ruff check . --fix` are faster spot checks). Fix any errors you introduced.
6. **Keep this file current** when commands, the `requests/` schema or the architecture change.
