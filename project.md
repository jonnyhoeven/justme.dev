---
layout: home
---

<script setup>
import { data as pages} from './data/project.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

# Projects

<ArticleList v-for="page of pages" :page="page"/>
