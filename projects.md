---
layout: home
title: Projects
intro: |
  A collection of projects over the years, that might be interesting.
image: /images/justme.dev.webp
---

<!--suppress CheckEmptyScriptTag, HtmlUnknownAttribute -->
<script setup>// noinspection JSUnresolvedReference
import { data as pages} from './data/project.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

# Projects

<ArticleList v-for="page of pages" :page="page"/>
