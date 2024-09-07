---
branch: master
date: 2024-04-18
editLink: false
fetchML: false
fetchReadme: false
githost: https://raw.githubusercontent.com/
image: /images/pg.webp
languages: Python 62.9%, JavaScript 32.5%, PLpgSQL 2.6%, Shell 0.6%, TypeScript 0.5%, CSS 0.3%, Other 0.6%
messages:
- content: 'You are a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences. Desired
    format: Intro: -||- BlogPost: -||-'
  role: system
- content: "  Write a blog post about pgAdmin4 using the following readme: pgAdmin is the leading Open Source management tool\
    \ \n  for Postgres, the world's most advanced Open Source database. pgAdmin 4 is designed to meet the needs of both \n\
    \  novice and experienced Postgres users alike, providing a powerful graphical interface that simplifies the creation,\
    \ \n  maintenance and use of database objects. pgAdmin 4 is a complete rewrite of pgAdmin, built using Python and Javascript/jQuery.\n\
    \  A desktop runtime written in NWjs allows it to run standalone for individual users, or the web application code \n\
    \  may be deployed directly on a web server for use by one or more users through their web browser."
  role: user
model: meta-llama/Llama-2-70b-chat-hf
project: pgadmin4
title: pgAdmin 4
type: post
user: pgadmin-org
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>



<ArticleFooter :frontmatter="$frontmatter"/>
