---
branch: main
date: 2024-03-01
fetchML: false
fetchReadme: true
githost: https://raw.githubusercontent.com
image: /images/justme.dev.png
intro: This VitePress site's source code is also available on GitHub. I needed a static site generator. VitePress is specifically
  designed for documentation websites. It is built on top of Vue, a modern build tool for frontend development.
languages: CSS,Typescript,Vue
outline: deep
project: justme.dev
readmeFile: README.md
title: Justme.dev
type: project
user: jonnyhoeven
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

This VitePress site is hosted from GitHub.io pages at [www.Justme.dev](https://www.justme.dev).

## Requirements

- Node version manager

```bash
curl -o- https//raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

- VitePress

```bash
npm install
```

## Development

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

Commit to the `main` branch to trigger [deployment](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml).

