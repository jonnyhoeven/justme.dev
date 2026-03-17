# Agent Guide: Justme.dev

This guide provides an overview of the repository structure and the content pipeline for AI agents and developers to
effectively maintain and improve the project.

## Repository Overview

`justme.dev` is a Cloud-Native Documentation platform built with **VitePress** and a custom **Python ETL pipeline**.

### Core Technologies

- **Frontend**: VitePress (Vue.js 3 + Vite)
- **Content Pipeline**: Python 3 (requests, PyYAML)
- **Deployment**: GitHub Pages (via GitHub Actions)

---

## Repository Structure

```text
├── .github/workflows/  # CI/CD pipelines (Build, Generate, Deploy)
├── bin/                # Python virtual environment binaries
├── blog/               # Generated and manual blog posts (Markdown)
├── blog.md             # VitePress entry point for the blog
├── components/         # Vue.js components used in Markdown files
├── data/               # VitePress data loaders (blog.data.js, project.data.js)
├── generate/           # Content aggregation pipeline
│   ├── process.py      # Main Python ETL script
│   └── requests/       # YAML manifests defining content sources
├── lib/                # Shared JavaScript utilities (transformPage.js)
├── projects/           # Generated and manual project documentation (Markdown)
├── projects.md         # VitePress entry point for projects
├── public/             # Static assets (images, webp files)
├── gen_image.sh        # Script for converting and resizing images to .webp
├── index.md            # Homepage layout and content
├── package.json        # Node.js dependencies and scripts
└── requirements.txt    # Python dependencies
```

---

## Content Pipeline (ETL)

The site aggregates content from external GitHub repositories using a Python script.

### 1. Request Manifests (`generate/requests/*.yaml`)

Each YAML file in this directory defines a content source.

- **`type`**: Determines the destination folder (`project` -> `projects/`, `blog` -> `blog/`).
- **`fetchReadme: true`**: Tells the pipeline to fetch a README from GitHub.
- **GitHub Info**: `user`, `project`, `branch`, `readmeFile`.
- **Frontmatter**: Additional metadata (title, date, image, intro, languages) is injected into the generated Markdown.

### 2. Processing (`generate/process.py`)

- Reads all YAML files in `generate/requests/`.
- Fetches the raw README content from GitHub.
- Wraps the content with Vue components (`ArticleItem.vue`, `ArticleFooter.vue`).
- Saves the result as a Markdown file with full YAML frontmatter.

### 3. Execution

Run the pipeline locally:

```bash
npm run docs:generate
```

---

## Components & Data

- **Vue Components**: Located in `components/`. They handle the visual presentation of articles and projects.
- **Data Loaders**: Located in `data/`. They use `createContentLoader` to dynamically list and sort Markdown files.
- **Transform Logic**: `lib/transformPage.js` sanitizes and enriches the frontmatter before it reaches the components (
  e.g., adding GitHub badge URLs).

---

## Working with Images

Images should be stored in `public/images/`.

- Use `gen_image.sh` to convert `.png` files from `input_images/` to optimized `.webp` format.
- Ensure `SIZE_WIDTH=653` and `SIZE_HEIGHT=378` are maintained for consistency.

---

## Guidelines for Agents

1. **Adding Project Content**: To add a new project or blog post from GitHub, create a new YAML file in
   `generate/requests/` rather than editing `projects/` directly.
2. **Adding Blog Content**: To add a blog post, create a new YAML file in `blog/`.
3. **Modifying UI**: Update components in `components/` or the transformation logic in `lib/transformPage.js`.
4. **Frontmatter**: Always ensure `date` and `type` are present in request manifests to maintain correct sorting and
   routing. the image file can be a temporary placeholder for the user to update.
5. **Consistency**: Follow the established pattern of wrapping Markdown content in `<script setup>` with `ArticleItem`
   and `ArticleFooter`.
