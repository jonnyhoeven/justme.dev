<script setup lang="ts">
import Badges from './Badges.vue'

defineProps(['frontmatter'])
</script>

<template>
  <div class="article-detail">
    <h1 v-if="frontmatter && frontmatter.title">{{ frontmatter.title }}</h1>
    <div v-if="frontmatter" class="container_row">
      <div class="articleImagebg layerbg"></div>
      <div class="layerimg">
        <div v-if="frontmatter.image" class="articleImage" :style="{ backgroundImage: 'url(' + frontmatter.image + ')' }">
        </div>
        <Badges :frontmatter="frontmatter" />
      </div>
    </div>
    <div v-if="frontmatter && frontmatter.intro" v-html="frontmatter.intro"></div>
    <br/>
  </div>
</template>
