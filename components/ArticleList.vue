<script setup lang="ts">
import Badges from './Badges.vue';

defineProps(['page']);
</script>

<template v-if="page">
  <div v-if="page.frontmatter" class="container_row">
    <div class="listImagebg layerbg"></div>
    <div class="layerimg">
      <div v-if="page.frontmatter.image" class="listImage"
        :style="{ backgroundImage: 'url(' + page.frontmatter.image + ')' }"></div>
    </div>
    <div v-if="page.frontmatter.title" class="layercontent">
      <h3 class="post-title">
        <a :href="page.url" class="stretched-link nolinkdecor">{{ page.frontmatter.title }}</a>
      </h3>
      <div v-if="page.frontmatter.intro" class="post-intro" v-html="page.frontmatter.intro"></div>
      <Badges :frontmatter="page.frontmatter" />
    </div>
  </div>
</template>

<style>
.nolinkdecor {
  text-decoration: none !important;
  color: inherit !important;
}

.container_row {
  display: grid;
  position: relative;
}

.stretched-link::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  content: "";
}

.layerbg,
.layerimg {
  grid-column: var(--ls-listitem-image-col);
  grid-row: var(--ls-listitem-image-row);
  padding: var(--ls-listitem-image-padding);
  margin-right: 32pt;
}

.layercontent {
  grid-column: var(--ls-listitem-content-col);
  grid-row: var(--ls-listitem-content-row);
  display: flex;
  flex-direction: column;
}

.post-title {
  margin: 0 0 0.8rem 0 !important;
  padding-top: 0 !important;
  border-top: none !important;
  position: relative;
  font-family: var(--vp-font-family-heading);
  font-weight: 600;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}

.post-intro {
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.85;
  margin-bottom: 1.2rem;
  max-width: 65ch;
}

.listImage {
  width: var(--ls-listitem-image-width);
  height: var(--ls-listitem-image-height);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 6pt;
  border: 1px solid var(--vp-c-brand-soft);
  transition: all 1s ease-in-out;
  padding: var(--ls-listitem-image-padding);
}

.container_row:hover .listImage {
  transform: skew(-0deg, -4deg) rotate(2deg) scale(1.08);
}

.listImagebg {
  width: var(--ls-listitem-image-width);
  height: var(--ls-listitem-image-height);
  background-image: radial-gradient(circle at 50% 50%, #3b82f6 0%, #8b5cf6 100%);
  opacity: 0.25;
  filter: blur(var(--ls-listitem-image-bg-blur));
  z-index: -10;
  transition: all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: var(--ls-listitem-image-padding);
}

.container_row:hover .listImagebg {
  transform: skew(-1.5deg, -0.5deg) rotate(-0.4deg) scale(1.05);
  filter: blur(var(--ls-listitem-image-bg-blur-hover));
}
</style>