---
layout: home
title: Projects
intro: |
    A collection of blog posts for dev ops developers, system administrators and software developers. 
image: /images/justme.dev.webp
---

<script setup>
import {data as pages} from './data/blog.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

# Blog
<ArticleList v-for="page of pages" :page="page"/>
