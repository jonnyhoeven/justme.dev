---
layout: home
---

<script setup>
import { data as posts} from './data/blog.data.js';
import ArticleListitem from '/components/articleListItem.vue';
</script>

# Blog

<ArticleListitem v-for="post of posts" :page="post"/>
