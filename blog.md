---
layout: home
---

<script setup>
import {data as pages} from './data/blog.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

# Blog
<ArticleList v-for="page of pages" :page="page"/>
