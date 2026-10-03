# TODO: 3D Splat Hosting & Cloudflare R2 Integration

This document outlines the roadmap and requirements for hosting large 3D Gaussian Splat assets on Cloudflare R2 and rendering an interactive 3D splat demo viewer directly on [justme.dev](https://justme.dev).

---

## 📌 Context & Cloudflare R2 Setup

- **Cloudflare R2 Console**: [Cloudflare R2 Overview](https://dash.cloudflare.com/df22016f7c6305bfd306445c79947e9d/r2/overview)
- **Primary Objective**: Offload heavy static assets (Gaussian Splat `.splat`/`.ply`/`.ksplat` models, audio files, high-res images) from the Git repository and GitHub Pages deployment bundle onto high-performance, zero-egress-fee cloud storage.
- **Site URL**: `https://justme.dev` (Local: `http://localhost:5173`)

---

## 🎯 Implementation Milestones

### Phase 1: Storage & Bucket Configuration

- [ ] **Create/Configure R2 Bucket**:
  - Name: `justme-assets` (or configured bucket name in R2).
  - Connect a custom domain (e.g. `cdn.justme.dev`) or enable managed R2 public access.
- [ ] **Configure Bucket CORS**:
  - WebGL/WebGPU splat loaders (`fetch`) and Web Audio API (`createMediaElementSource`) strictly require valid CORS headers.
  - Apply the following CORS policy in Cloudflare R2 bucket settings:
    ```json
    [
      {
        "AllowedOrigins": [
          "https://justme.dev",
          "https://jonnyhoeven.github.io",
          "http://localhost:5173",
          "http://localhost:4173"
        ],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": [
          "Content-Length",
          "Content-Range",
          "Accept-Ranges",
          "ETag"
        ],
        "MaxAgeSeconds": 86400
      }
    ]
    ```

### Phase 2: Local Staging & Sync Scripting

- [ ] Add `/cdn/` to [`.gitignore`](file:///Users/john/IdeaProjects/justme.dev/.gitignore).
- [ ] Organize local staging assets:
  ```
  cdn/
  ├── splats/       # .splat, .ply, .ksplat 3D scene files
  ├── audio/        # Easter egg music tracks
  └── images/       # High-resolution demo renders
  ```
- [ ] Create `scripts/sync_cdn.py` (or shell/rclone wrapper) to upload updated local files to R2 using S3-compatible credentials.

### Phase 3: Interactive 3D Splat Demo on Site

- [ ] Select and integrate a lightweight 3D Gaussian Splat viewer (e.g., `@mkkellogg/gaussian-splats-3d` or Antimatter15 WebGL splat renderer).
- [ ] Create a dedicated Vue component (e.g., `components/SplatViewerDemo.vue`) with:
  - Responsive canvas sizing.
  - Progressive streaming of `.splat` files from `https://cdn.justme.dev/splats/<name>.splat`.
  - Orbit camera controls and touch navigation for mobile.
  - `IntersectionObserver` lifecycle management (pause rendering when canvas is outside the viewport per `GEMINI.md`).
- [ ] Add a demo page or section in the documentation portal displaying the live 3D capture.

### Phase 4: CI Pre-Deployment & Integrity Validation

- [ ] Create `scripts/verify_cdn_assets.py` to run in [`.github/workflows/deploy.yml`](file:///Users/john/IdeaProjects/justme.dev/.github/workflows/deploy.yml) before `docs:build`.
- [ ] Validate that all splat models and audio files referenced in site constants return HTTP 200/206 with correct `Content-Type` and CORS headers.

---

## 🧪 Milestone: E2E Playwright Testing

This section documents the prerequisites, architecture, and roadmap for reinstating end-to-end browser testing with Playwright on [justme.dev](https://justme.dev).

### Context & Why E2E Was Deferred

The orphaned `tests/e2e/blog.spec.js` file was removed because `@playwright/test` was not in `package.json` dependencies, no runner script existed, and browser binaries were not provisioned in the Nix development environment (`flake.nix`). In addition, the original test contained an invalid compound selector that caused false assertion failures.

### Key Technical Considerations

1. **Card Link Selector Bug Fix (`a.post-title a` vs `a.stretched-link`)**:
   - In [`components/ArticleList.vue`](file:///Users/john/IdeaProjects/justme.dev/components/ArticleList.vue), article cards use two distinct link elements:
     - The visible title heading: `<h3 class="post-title"><a :href="page.url" class="nolinkdecor">{{ page.frontmatter.title }}</a></h3>`
     - The absolute overlay hit area: `<a :href="page.url" class="stretched-link" :aria-label="..."></a>`
   - The original spec searched for `a.stretched-link.nolinkdecor`, erroneously expecting both classes on a single element.
   - **Fix**: Use `h3.post-title a` (or `.post-title a`) when testing article title visibility and text content, and use `a.stretched-link` when validating click navigation and card tap targets.

2. **Nix Flake Browser Dependencies**:
   - Playwright requires system libraries and headless browser binaries (Chromium, Firefox, WebKit).
   - In NixOS / Nix flake environments, downloading browsers via `npx playwright install` fails unless system library paths are patched.
   - **Solution**: Configure `flake.nix` with `pkgs.playwright-driver.browsers` or export `PLAYWRIGHT_BROWSERS_PATH` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the devshell so Playwright uses Nix-managed browsers.

### Implementation Checklist

- [ ] **Phase 1: Environment & Tooling**
  - [ ] Add Playwright browser packages to `flake.nix` devshell.
  - [ ] Add `@playwright/test` to `devDependencies` in `package.json` (pin overrides in `pnpm-workspace.yaml`).
  - [ ] Create `playwright.config.ts` configured for local VitePress dev/preview server.
  - [ ] Add `"test:e2e": "playwright test"` to `package.json` scripts.
- [ ] **Phase 2: Test Suite Reimplementation**
  - [ ] Recreate `tests/e2e/blog.spec.ts` using corrected selectors (`.post-title a` for title verification, `a.stretched-link` for card clicks).
  - [ ] Add E2E tests for DocSearch modal trigger, project card list, and markdown content hydration.
  - [ ] Add Hero splat canvas rendering and Easter Egg audio toggle interaction tests.
- [ ] **Phase 3: CI Integration**
  - [ ] Add Playwright execution step to `.github/workflows/deploy.yml` within the Nix CI job.
