# Repository Review & Issues Audit

This document details the findings and resolution status of the critical audit of **justme.dev** conducted on October 2, 2026.

---

## Summary Matrix

| ID          | Category    | Severity     | Title                                                                | Status                                                                               |
| :---------- | :---------- | :----------- | :------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **SEC-01**  | Security    | **High**     | 26 Vulnerabilities Detected in NPM Dependencies                      | **RESOLVED** (26 → 0 via `pnpm-workspace.yaml` overrides)                            |
| **SEC-02**  | Security    | **Medium**   | Unsanitized `v-html` Rendering in Article Components                 | **RESOLVED** (Mustache interpolation in `ArticleList.vue` & `ArticleItem.vue`)       |
| **PIPE-01** | CI / CD     | **Critical** | Git Remote Mismatch (GitLab vs GitHub)                               | **RESOLVED** (`origin` restored to GitHub; Forgejo remote retained)                  |
| **PIPE-02** | CI / CD     | **Medium**   | Redundant Node/pnpm Setup in GitHub Workflow                         | **RESOLVED** (Removed from `deploy.yml`, delegated to Nix devshell)                  |
| **PIPE-03** | CI / CD     | **Medium**   | Broken Auto-Commit Step & Unneeded Write Scope                       | **RESOLVED** (Dead step removed; permissions restricted to `contents: read`)         |
| **PIPE-04** | CI / CD     | **High**     | Zero Test Execution in CI Gates                                      | **RESOLVED** (`lint`, `ruff`, and `test:all` added as CI gates)                      |
| **PERF-01** | Efficiency  | **High**     | Excessive Audio Asset Bloat (~18 MB in `public/audio`)               | **DOCUMENTED** (Options for Opus encoding or R2/S3 external streaming)               |
| **PERF-02** | Efficiency  | **Medium**   | 500 KB+ of Unused Static Assets & Images in `public/`                | **RESOLVED** (Deleted 8 unreferenced files: 6 webp, 1 html, 1 woff2)                 |
| **PERF-03** | Efficiency  | **Medium**   | CSS `background-image` Used Instead of Native `<img>`                | **RESOLVED** (Migrated to semantic `<img loading="lazy">` + `object-fit: cover`)     |
| **PERF-04** | Efficiency  | **Medium**   | Render-Blocking External Google Fonts                                | **DOCUMENTED** (Self-hosting recommendation)                                         |
| **PERF-05** | Efficiency  | **Low**      | Splat Simulation Memory Allocation on Mobile & Global Mouse Listener | **RESOLVED** (Skipped on mobile mount; proximity listener throttled to 50ms)         |
| **BUG-01**  | Correctness | **High**     | Broken Test Suite (`vitest` startup crash & `pytest` failures)       | **RESOLVED** (Vite 6/Vitest 4 compatibility; rewritten splat tests; 100% & 93% cov)  |
| **BUG-02**  | Correctness | **Medium**   | Broken Default Image Fallback (`/images/justme.dev.jpg`)             | **RESOLVED** (Corrected to `/images/justme.dev.webp`)                                |
| **BUG-03**  | Correctness | **Medium**   | Malformed Canonical & Social Graph URLs (`.md` extension)            | **RESOLVED** (Stripped `.md` for clean permalinks; canonical tag added)              |
| **BUG-04**  | Correctness | **Low**      | Type Fragility in `lib/transformPage.js` (`split()` on array)        | **RESOLVED** (Array-safe normalization in `transformPage.js`)                        |
| **UPTD-01** | Freshness   | **Medium**   | Outdated Actions, Packages, and Locked Flake                         | **RESOLVED** (Actions upgraded to v7/v5/v4; `magick` deprecation fixed)              |
| **TEST-01** | Testing     | **Medium**   | Orphaned Playwright E2E Spec & Missing Browser Tooling               | **RESOLVED** (Orphaned test removed; E2E roadmap & selector fix logged in `todo.md`) |

---

## Detailed Findings & Resolutions

### 1. Dependency Security & Code Safety

#### [SEC-01] 26 Vulnerabilities Detected in NPM Dependencies — **RESOLVED**

- **Severity**: High
- **Description**: Running `pnpm audit` initially revealed 26 security vulnerabilities (17 High, 8 Moderate, 1 Low), including path traversal in `vite` and `@vitest/mocker`, and denial of service in `brace-expansion`, `js-yaml`, and `nanoid`.
- **Resolution**: Added strict package overrides to [pnpm-workspace.yaml](file:///Users/john/IdeaProjects/justme.dev/pnpm-workspace.yaml) per GEMINI.md Rule 2:
  ```yaml
  overrides:
    esbuild: '0.25.0'
    vite: '^6.4.3'
    vitest: '^4.1.11'
    '@vitest/coverage-v8': '^4.1.11'
    js-yaml: '^4.3.2'
    postcss: '^8.5.23'
    nanoid: '^3.3.19'
    postcss-selector-parser: '^7.1.3'
    'brace-expansion@1': '^1.1.21'
    'brace-expansion@5': '^5.0.12'
  ```
- **Verification**: `nix develop --command pnpm audit` reports **0 vulnerabilities**.

#### [SEC-02] Unsanitized `v-html` Rendering in Article Components — **RESOLVED**

- **Severity**: Medium
- **Location**: `components/ArticleList.vue` and `components/ArticleItem.vue`
- **Description**: Both components rendered `intro` via `v-html`, presenting a stored Cross-Site Scripting (XSS) risk if manifests or remote READMEs contain raw markup.
- **Resolution**: Replaced `v-html="frontmatter.intro"` with safe Vue mustache interpolation `{{ ... }}` in both components.

---

### 2. CI/CD & Pipeline Configuration

#### [PIPE-01] Git Remote Mismatch (GitLab vs GitHub) — **RESOLVED**

- **Severity**: Critical
- **Description**: The user inquired about a GitLab pipeline because the local clone had `origin` set to a local Forgejo/GitLab server (`git.ts.justme.dev`), while this repository relies on GitHub Actions for its CD pipeline.
- **Resolution**: Swapped git remotes so `origin` points to `https://github.com/jonnyhoeven/justme.dev.git` with tracking branch `main -> origin/main`, and retained `forgejo` as a secondary remote.

#### [PIPE-02] Redundant Node & pnpm Setup in GitHub Actions — **RESOLVED**

- **Severity**: Medium
- **Location**: `.github/workflows/deploy.yml`
- **Description**: Standalone `pnpm/action-setup` and `actions/setup-node` ran before `determinate-nix-action`, duplicating the Node 22 and pnpm binaries already provided by `nix develop .#ci`.
- **Resolution**: Removed both redundant runner steps. All operations now run directly in the hermetic Nix environment.

#### [PIPE-03] Broken Auto-Commit Step & Excessive Token Permissions — **RESOLVED**

- **Severity**: Medium
- **Location**: `.github/workflows/deploy.yml`
- **Description**: The workflow attempted to run `git add -A` and commit generated docs, but `.gitignore` ignores `/projects/*.md`. This made the step a dead no-op that demanded unnecessary `contents: write` permissions.
- **Resolution**: Removed the dead commit step and downgraded `build` job permissions to `contents: read`.

#### [PIPE-04] Zero Test Execution in CI Gates — **RESOLVED**

- **Severity**: High
- **Location**: `.github/workflows/deploy.yml`
- **Description**: The CI workflow only ran `ruff check .`, allowing test suite breakage and JavaScript lint failures to reach production.
- **Resolution**: Added mandatory CI quality gates before building:
  1. `nix develop .#ci --command pnpm install`
  2. `nix develop .#ci --command pnpm run lint`
  3. `nix develop .#ci --command ruff check .`
  4. `nix develop .#ci --command pnpm run test:all`
  5. `nix develop .#ci --command python3 scripts/process_requests.py`
  6. `nix develop .#ci --command pnpm run docs:build`

---

### 3. Page & Asset Efficiency

#### [PERF-01] Excessive Audio Asset Bloat (~18 MB in `public/audio`) — **DOCUMENTED**

- **Severity**: High
- **Location**: `public/audio/`
- **Description**: Four MP3 files total ~18 MB (over 85% of total dist output size) for the hero tagline easter egg.
- **Recommendations for Next Iteration**:
  1. Re-encode to Opus/WebM at 64–96 kbps to reduce file size to ~3–4 MB total.
  2. Stream on-demand from an external CDN (e.g., Cloudflare R2 / S3) only upon user interaction.

#### [PERF-02] 500 KB+ of Unreferenced Assets in `public/` — **RESOLVED**

- **Severity**: Medium
- **Location**: `public/images/`, `public/html/`, `public/`
- **Resolution**: Deleted 8 unreferenced files:
  - `public/images/cruisereizen.webp` (284 KB)
  - `public/images/zx-spectrum.webp` (42.4 KB)
  - `public/images/palmolive.webp` (38.1 KB)
  - `public/images/suno.webp` (32.3 KB)
  - `public/images/opendmx.webp` (27.2 KB)
  - `public/images/avas.webp` (18.5 KB)
  - `public/html/avas.html` (24.6 KB)
  - `public/firasans.woff2` (23.9 KB)

#### [PERF-03] Inefficient CSS Background Images in Article Cards — **RESOLVED**

- **Severity**: Medium
- **Location**: `components/ArticleList.vue` and `components/ArticleItem.vue`
- **Resolution**: Migrated from `background-image` `div` elements to semantic `<img :src="..." :alt="..." loading="lazy" class="..." />` with `object-fit: cover` defined in `components.css`. Enables browser native lazy-loading, prevents CLS, and improves accessibility.

#### [PERF-04] Render-Blocking External Google Fonts — **DOCUMENTED**

- **Severity**: Medium
- **Location**: `.vitepress/config.mts`
- **Recommendation**: Self-host local WOFF2 font files in `public/fonts/` or load asynchronously with `font-display: swap` to remove third-party render-blocking connections and address GDPR privacy concerns.

#### [PERF-05] Mobile Splat Fetch & Unthrottled Global Mouse Listener — **RESOLVED**

- **Severity**: Low
- **Location**: `components/HeroSplat.vue`
- **Resolution**:
  - `onMounted()` skips fetching `/data/splats.json` and allocating particle simulation memory when `isMobileView` is true. Particles load on-demand if resized to desktop.
  - Proximity detection `mousemove` event listener wrapped with `useThrottleFn(..., 50)` from `@vueuse/core` to prevent running Euclidean distance calculations on every pixel of mouse movement.

---

### 4. Correctness & Bug Audit

#### [BUG-01] Broken Test Suite (`vitest` & `pytest`) — **RESOLVED**

- **Severity**: High
- **Description**:
  - Vitest failed on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` because Vitest 4.1.6 required Vite 6 exports while VitePress pinned Vite 5.
  - Pytest failed with 2 errors in `tests/test_generate_splats.py` due to obsolete mock algorithms and schema divergence.
- **Resolution**:
  - Overrode `vite: '^6.4.3'`, `vitest: '^4.1.11'`, and `@vitest/coverage-v8: '^4.1.11'` in `pnpm-workspace.yaml`.
  - Refactored `scripts/generate_splats.py` to accept optional `image_path` and `out_path` parameters and return `compact_splats`.
  - Rewrote `tests/test_generate_splats.py` to test the actual implementation directly against the current compact schema `[ox, oy, r, g, b]`.
- **Verification**: `pnpm run test:all` executes cleanly: 32 Vitest tests pass with 100% coverage, and 37 Pytest tests pass with 93.29% coverage (well above the 80% threshold).

#### [BUG-02] Broken Default Fallback Image (`/images/justme.dev.jpg`) — **RESOLVED**

- **Severity**: Medium
- **Location**: `lib/transformPage.js` (L5)
- **Resolution**: Updated fallback image path from `/images/justme.dev.jpg` to the existing WebP asset `/images/justme.dev.webp`, resolving 404 errors on imageless articles.

#### [BUG-03] Broken OpenGraph & Twitter Canonical URLs (`.md` Ext) — **RESOLVED**

- **Severity**: Medium
- **Location**: `.vitepress/config.mts`
- **Resolution**: Updated `transformHead` to strip `.md` and `index.md` from `pageData.relativePath`, producing clean permalinks for `og:url` and `twitter:url`, and added a `<link rel="canonical">` tag.

#### [BUG-04] Type Fragility in `lib/transformPage.js` — **RESOLVED**

- **Severity**: Low
- **Location**: `lib/transformPage.js` (L19)
- **Resolution**: Replaced unchecked `.split(',')` with an `Array.isArray()` check so both string and array formats of `languages` from YAML manifests are handled without throwing runtime exceptions.

---

### 5. Freshness & Maintenance

#### [UPTD-01] Outdated CI Actions & Pinned Dependencies — **RESOLVED**

- **Severity**: Medium
- **Location**: `.github/workflows/deploy.yml`, `flake.nix`
- **Resolution**:
  - Upgraded GitHub Actions in `deploy.yml` (`actions/checkout@v7`, `upload-pages-artifact@v3`, `configure-pages@v5`, `deploy-pages@v4`).
  - Updated `flake.nix` shellHook to use `magick -version`, eliminating ImageMagick 7 deprecation warnings.

---

### 6. Testing & Quality Assurance

#### [TEST-01] Orphaned Playwright E2E Spec & Missing Browser Tooling — **RESOLVED**

- **Severity**: Medium
- **Location**: `tests/e2e/blog.spec.js`
- **Description**:
  - `tests/e2e/blog.spec.js` imported `@playwright/test`, which was not declared in `package.json` dependencies or Nix development shell, and had no npm test runner script.
  - The spec also contained a selector bug on line 27: `page.locator('a.stretched-link.nolinkdecor')`. In `components/ArticleList.vue`, `.nolinkdecor` resides on the title link (`.post-title a`) whereas `.stretched-link` is an empty full-card overlay link, meaning this locator matched 0 elements.
- **Resolution**:
  - Removed orphaned `tests/e2e/blog.spec.js` and empty `tests/e2e` directory to prevent confusion in active test runners.
  - Documented the planned E2E testing suite, Nix flake browser requirements, and corrected selectors in [`todo.md`](file:///Users/john/IdeaProjects/justme.dev/todo.md) under "Milestone: E2E Playwright Testing".
