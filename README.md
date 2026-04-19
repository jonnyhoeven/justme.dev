# Justme.dev - Cloud-Native Documentation Architecture

A scalable, serverless documentation platform demonstrating modern Static Site Generation (SSG) and Automated
Content Aggregation. This project serves as a reference architecture for centralized knowledge management, leveraging
VitePress (Vue.js) for high-performance frontend delivery and a custom Python ETL pipeline for dynamic content
ingestion from distributed repositories.

Hosted on GitHub Pages with fully automated CI/CD pipelines, ensuring high availability, zero-maintenance
infrastructure, and rapid content delivery.

## Architecture Overview

Frontend: VitePress (Vue 3 + Vite) for lightning-fast static site generation and SEO optimization.
Content Pipeline: Custom Python-based ETL (Extract, Transform, Load) system that aggregates READMEs and metadata
from multiple GitHub repositories into a unified portal.
Infrastructure: Serverless deployment via GitHub Pages.
CI/CD: GitHub Actions for automated build, test, and deployment workflows.

## Key Features

Automated Content Aggregation: Centralizes documentation from disparate microservices/projects into a single
source of truth.
High Performance: Pre-rendered static HTML with client-side hydration for SPA-like navigation.
Developer Experience (DX): Markdown-centric workflow with hot module replacement (HMR) for rapid iteration.
Scalability: Stateless architecture capable of handling high traffic loads via CDN distribution.

## Prerequisites

This project utilizes a **Nix Flake** and **direnv** to manage a fully declarative development environment. This ensures that Node.js, Python (with libraries), and ImageMagick are automatically provisioned and kept consistent across all machines and CI/CD.

### 1. Install Nix & Direnv

If you don't have them installed:

- [Install Nix](https://nixos.org/download/)
- [Install direnv](https://direnv.net/docs/installation.html)

### 2. Enter the Environment

Once installed, simply `cd` into the project directory and allow the environment:

```bash
direnv allow
```

The environment will automatically load:

- **Node.js 22**
- **Python 3** (pre-configured with `pyyaml` and `requests`)
- **ImageMagick** (for local image processing)
- **Ruff** (for linting)

### 3. Project Dependencies

```bash
npm install
```

## Operational Workflows

### Content Generation (ETL)

Executes the Python pipeline to fetch and transform remote documentation into local Markdown resources.

```bash
npm run docs:generate
```

### Splat/Asset Generation

Generates and processes splat-related assets.

```bash
npm run docs:generate-splats
```

### Local Development

Starts the VitePress development server with hot-reload capabilities.

```bash
npm run docs:dev
```

### Production Build

Compiles the application into static assets optimized for production deployment.

```bash
npm run docs:build
```

### Artifact Preview

Locally preview the production build to verify rendering and behavior.

```bash
npm run docs:preview
```

### Deployment Strategy

Continuous Deployment is managed via GitHub Actions executing inside a Nix environment. Commits to the `main` branch trigger the [deploy workflow](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml), which ensures the production build environment exactly matches the local development state.

## Configuration & Extensibility

- **Request Manifests**: Content sources are defined in `requests/*.yaml`.
- **Output Structure**: Generated Markdown files are organized into the `projects/` folder
