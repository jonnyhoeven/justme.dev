<script setup lang="ts">
import Badges from './Badges.vue';

interface Frontmatter {
  title?: string;
  image?: string;
  intro?: string;
  [key: string]: unknown;
}

defineProps<{
  frontmatter?: Frontmatter;
}>();
</script>

<template>
  <article class="article-detail">
    <h1 v-if="frontmatter && frontmatter.title">{{ frontmatter.title }}</h1>
    <div v-if="frontmatter" class="container_row">
      <div class="articleImagebg layerbg"></div>
      <div class="layerimg">
        <img
          v-if="frontmatter.image"
          :src="frontmatter.image"
          :alt="frontmatter.title || 'Article image'"
          loading="lazy"
          class="articleImage"
        />
        <Badges :frontmatter="frontmatter" />
      </div>
    </div>

    <div v-if="frontmatter && frontmatter.intro" class="post-intro">
      {{ frontmatter.intro }}
    </div>
    <br />
  </article>
</template>
