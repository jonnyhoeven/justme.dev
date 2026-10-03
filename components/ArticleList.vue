<script setup lang="ts">
import Badges from './Badges.vue';
import type { ArticlePage } from '../types/frontmatter';

defineProps<{
  page?: ArticlePage;
}>();
</script>

<template>
  <article
    v-if="page && page.frontmatter"
    class="container_row clickable-card"
    :aria-labelledby="'title-' + page.url.replace(/\//g, '-')"
  >
    <div class="listImagebg layerbg"></div>

    <div class="layerimg">
      <img
        v-if="page.frontmatter.image"
        :src="page.frontmatter.image"
        :alt="page.frontmatter.title || 'Article thumbnail'"
        loading="lazy"
        class="listImage"
      />
    </div>
    <div v-if="page.frontmatter.title" class="layercontent">
      <h3 :id="'title-' + page.url.replace(/\//g, '-')" class="post-title">
        <a :href="page.url" class="nolinkdecor">{{ page.frontmatter.title }}</a>
      </h3>
      <div v-if="page.frontmatter.intro" class="post-intro">
        {{ page.frontmatter.intro }}
      </div>
      <Badges :frontmatter="page.frontmatter" />
    </div>
    <a
      :href="page.url"
      class="stretched-link"
      :aria-label="'Read more about ' + page.frontmatter.title"
    ></a>
  </article>
</template>

<style scoped>
.stretched-link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #3498db);
  outline-offset: 2px;
}
</style>
