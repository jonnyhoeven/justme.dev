---
layout: home
---

<script setup>
import { data as posts } from './data/blog.data.js'
import ArticleListitemComponent from '/components/articleListItem.vue';
</script>

# Blog

Latest blog posts about software development, programming and other tech related topics.

<ArticleListitemComponent v-for="post of posts" :article="post"/>

