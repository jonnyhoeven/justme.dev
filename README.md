# Justme.dev - Cloud-Native Documentation Architecture

A scalable, serverless documentation platform demonstrating modern **Static Site Generation (SSG)** and **Automated
Content Aggregation**. This project serves as a reference architecture for centralized knowledge management, leveraging
**VitePress** (Vue.js) for high-performance frontend delivery and a custom **Python ETL pipeline** for dynamic content
ingestion from distributed repositories.

Hosted on **GitHub Pages** with fully automated CI/CD pipelines, ensuring high availability, zero-maintenance
infrastructure, and rapid content delivery.

## Architecture Overview

* **Frontend**: VitePress (Vue 3 + Vite) for lightning-fast static site generation and SEO optimization.
* **Content Pipeline**: Custom Python-based ETL (Extract, Transform, Load) system that aggregates READMEs and metadata
  from multiple GitHub repositories into a unified portal.
* **Infrastructure**: Serverless deployment via GitHub Pages.
* **CI/CD**: GitHub Actions for automated build, test, and deployment workflows.

## Key Features

* **Automated Content Aggregation**: Centralizes documentation from disparate microservices/projects into a single
  source of truth.
* **High Performance**: Pre-rendered static HTML with client-side hydration for SPA-like navigation.
* **Developer Experience (DX)**: Markdown-centric workflow with hot module replacement (HMR) for rapid iteration.
* **Scalability**: Stateless architecture capable of handling high traffic loads via CDN distribution.

## Prerequisites

Ensure your environment meets the following requirements for local development:

### Node.js Environment

Managed via `nvm` for version consistency.

```bash
# Install nvm (if not present)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Install and use the required Node.js version
nvm install
nvm use
```

### Python Environment

Required for the content aggregation pipeline.

```bash
# Set up a virtual environment
sudo apt install python3-venv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Project Dependencies

```bash
npm install
```

## Operational Workflows

### Content Generation (ETL)

Executes the Python pipeline to fetch and transform remote documentation into local Markdown resources.

```bash
npm run docs:generate
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

Continuous Deployment is managed via **GitHub Actions**. Commits to the `main` branch trigger
the [deploy workflow](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml), which executes the
following pipeline:

1. **Generate**: Aggregates latest content from source repositories.
2. **Build**: Compiles static assets.
3. **Deploy**: Publishes artifacts to GitHub Pages.

## Configuration & Extensibility

* **Request Manifests**: Content sources are defined in `generate/requests/*.yaml`.
* **Output Structure**: Generated Markdown files are organized by `request type` (e.g., `projects/`) to maintain a clean
  information architecture.
