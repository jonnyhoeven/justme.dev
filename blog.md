---
layout: home
---

<script setup>
import { data as posts } from './data/posts.data.js'
import ArticleComponent from '/components/article.vue';
</script>

# Blog

Latest blog posts about software development, programming and other tech related topics.

<ArticleComponent v-for="post of posts" :article="post"/>

