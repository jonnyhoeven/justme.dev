---
outline: deep
layout: home
---

<script setup>
import { data as pages} from './data/projects.data.js';
import ArticleListitem from '/components/articleListItem.vue';
</script>

# Projects

<ArticleListitem v-for="page of pages" :page="page"/>
