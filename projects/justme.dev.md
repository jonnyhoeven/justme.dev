---
title: Justme.dev
date: 2014-08-16
image: /images/cvti.jpg
githost: https://github.com
user: jonnyhoeven
project: justme.dev
branch: main
languages: CSS,Typescript,Vue
intro: This VitePress site's source code is also available on GitHub. I needed a static site generator.
    VitePress is specifically designed for documentation websites. It is built on top of Vue,
    a modern build tool for frontend development.
---
<script setup>
import ArticleItem from '/components/articleItem.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>
