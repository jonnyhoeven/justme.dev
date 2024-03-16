---
layout: home
---

<script setup>
import { data as posts } from './data/posts.data.js'
</script>

# Blog

Latest blog posts about software development, programming and other tech related topics.

<div v-for="post of posts">
  <h2>{{ post.frontmatter.title }}</h2>
    <p>
      <a :href="post.url"><img alt="post.frontmatter.title" :src="post.frontmatter.image" class="listImage"></a>
      <span v-html="post.excerpt"></span>
      <a :href="post.url"> read more...</a>
      <span style="float:right;">{{ post.frontmatter.author }}</span>
    </p>
</div>

