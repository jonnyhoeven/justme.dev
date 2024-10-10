---
branch: main
date: 2024-03-01
fetchML: false
fetchReadme: true
gitlink: https://github.com/jonnyhoeven/justme.dev
image: /images/justme.dev.webp
intro: This site's source code is also available on GitHub. I needed a static site generator. VitePress is specifically designed
  for documentation websites. It is built on top of Vue, a modern build tool for frontend development.
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
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>

This VitePress site is hosted from GitHub.io pages at [www.Justme.dev](https://www.justme.dev).

## Requirements

### OpenAI API key

Only needed if generating content from OpenAI.

### Updated env file

Copy the [.env.example](.env.example) file to [.env](.env) and fill in the required fields.

```bash
cp .env.example .env
```

### Node version manager

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install
nvm use
```

### Python & pip

*Only needed if generating content from OpenAI.*

```bash
sudo apt install python3
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Install dependencies

```bash
npm install
```

## How to use

### Generate content

Downloads readme files from GitHub repositories and when configured connects to the OpenAI API to generate content.

```bash
npm run docs:generate
```

### Development

```bash
npm run docs:dev
```

### Build

```bash
npm run docs:build
```

### Preview build

```bash
npm run docs:preview
```

### Deploy

Commit to the `main` branch to
trigger [deployment](https://github.com/jonnyhoeven/justme.dev/actions/workflows/deploy.yml).

## Notes

- Create request files in the `requests` folder, for example: [logseq.yaml.example](openai/request/logseq.yaml.example).
- Run the `npm run docs:generate` command to generate the markdown files locally.
- When pushing to `main` GitHub action does `generate`, `build` and `deploy`.
- The OpenAI response will be saved in the response folder.
- The generated markdown will be saved in a sub folder defined by `request type` using the same name as the request file
  and the suffix `.md`.
- Delete corresponding `response.bin` in `./openai/response` to force the script to retrieve data from `openai`
  again.


<ArticleFooter :frontmatter="$frontmatter"/>
