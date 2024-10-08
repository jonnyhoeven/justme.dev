---
layout: home
title: Projects
intro: |
  A collection of projects I have worked on.
image: /images/logo.webp
---

<script setup>
import { data as pages} from './data/project.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

# Projects

<ArticleList v-for="page of pages" :page="page"/>
