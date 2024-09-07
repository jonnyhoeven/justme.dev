---
branch: main
date: 2024-03-28
editLink: false
fetchML: false
fetchReadme: false
githost: https://raw.githubusercontent.com/
image: /images/gorilla-cli.webp
languages: Python, Jinja, Shell, Dockerfile
messages:
- content: 'You are a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences. Desired
    format: Intro: -||- BlogPost: -||-'
  role: system
- content: Gorilla CLI powers your command-line interactions with a user-centric tool. Simply state your objective, and Gorilla
    CLI will generate potential commands for execution. Gorilla today supports ~1500 APIs, including Kubernetes, AWS, GCP,
    Azure, GitHub, Conda, Curl, Sed, and many more. No more recalling intricate CLI arguments!
  role: user
model: google/gemma-7b-it
project: tpa
title: Gorilla CLI
type: post
user: EnterpriseDB
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>



<ArticleFooter :frontmatter="$frontmatter"/>
