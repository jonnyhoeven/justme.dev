---
title: Justme.dev
type: project
date: 2024-03-01
image: /images/justme.dev.png
githost: https://github.com
user: jonnyhoeven
project: justme.dev
branch: main
fetchReadme: true 
languages: CSS,Typescript,Vue
intro: This VitePress site's source code is also available on GitHub. I needed a static site generator.
    VitePress is specifically designed for documentation websites. It is built on top of Vue,
    a modern build tool for frontend development.
---
<script setup>
import ArticleItem from '/components/ArticleItem.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>
