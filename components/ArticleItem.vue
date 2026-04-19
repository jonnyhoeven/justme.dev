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
        <div
          v-if="frontmatter.image"
          class="articleImage"
          role="img"
          :aria-label="frontmatter.title || 'Article image'"
          :style="{ backgroundImage: 'url(' + frontmatter.image + ')' }"
        ></div>
        <Badges :frontmatter="frontmatter" />
      </div>
    </div>

    <div
      v-if="frontmatter && frontmatter.intro"
      v-html="frontmatter.intro"
    ></div>
    <br />
  </article>
</template>
