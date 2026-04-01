<script setup lang="ts">
import Badges from './Badges.vue';

defineProps(['page']);
</script>

<template v-if="page">
  <div v-if="page.frontmatter" class="container_row clickable-card">
    <div class="listImagebg layerbg"></div>
    <div class="layerimg">
      <div v-if="page.frontmatter.image" class="listImage"
        :style="{ backgroundImage: 'url(' + page.frontmatter.image + ')' }"></div>
    </div>
    <div v-if="page.frontmatter.title" class="layercontent">
      <h3 class="post-title">
        <a :href="page.url" class="nolinkdecor">{{ page.frontmatter.title }}</a>
      </h3>
      <div v-if="page.frontmatter.intro" class="post-intro" v-html="page.frontmatter.intro"></div>
      <Badges :frontmatter="page.frontmatter" />
    </div>
    <a :href="page.url" class="stretched-link" :aria-label="'Read more about ' + page.frontmatter.title"></a>
  </div>
</template>
