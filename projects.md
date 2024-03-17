---
outline: deep
layout: home
---

<script setup>
import { data as projects} from './data/projects.data.js';
import ArticleComponent from '/components/article.vue';
</script>

# Projects

These are some of the open source projects I have been involved in since 2014.

<ArticleComponent v-for="project of projects" :article="project"/>
