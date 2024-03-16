---
layout: home
---

<script setup>
import { data as posts } from './data/posts.data.js'
</script>

# Blog posts

Latest blog posts about software development, programming, and other tech related topics.

<div v-for="post of posts">
  <h2><a :href="post.url">{{ post.frontmatter.title }}</a></h2>
  <p v-html="post.excerpt"></p>
  <span>{{post.frontmatter.date}}</span>
  <span style="float:right;">{{ post.frontmatter.author }}</span>
</div>

