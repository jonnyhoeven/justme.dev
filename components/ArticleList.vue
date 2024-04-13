<script setup>
import Badges from '/components/Badges.vue';

defineProps(['page']);
</script>

<template v-if="page">
  <a :href="page.url" class="nolinkdecor">
    <div class="container_row">
      <div class="listImagebg layerbg"></div>
      <div class="layerimg">
        <div class="listImage" :style="{backgroundImage: 'url('+ page.frontmatter.image +')'}"></div>
      </div>
      <div class="layercontent">
        <h3 style="margin:15pt 0 10pt;">{{ page.frontmatter.title }}</h3>
        <span v-html="page.frontmatter.intro"></span>
        <Badges :frontmatter="page.frontmatter"/>
      </div>
    </div>
  </a>
</template>

<style>

.nolinkdecor {
  text-decoration: none !important;
  color: inherit !important;
}

.container_row {
  display: grid;
}

.layerbg, .layerimg {
  grid-column: var(--ls-listitem-image-col);
  grid-row: var(--ls-listitem-image-row);
  padding: var(--ls-listitem-image-padding);
}

.layercontent {
  grid-column: var(--ls-listitem-content-col);
  grid-row: var(--ls-listitem-content-row);
  margin: 10pt 0 20pt 0;
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
  background-image: linear-gradient(-28deg, rgb(15, 196, 93) 50%, rgb(34, 188, 238) 50%);
  filter: blur(var(--ls-listitem-image-bg-blur));
  z-index: -10;
  transition: all 0.5s ease-in-out;
  padding: var(--ls-listitem-image-padding);
}

.container_row:hover .listImagebg {
  transform: skew(-1.5deg, -0.5deg) rotate(-0.4deg) scale(1.05);
  filter: blur(var(--ls-listitem-image-bg-blur-hover));
}

</style>