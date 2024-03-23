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
        <p><strong>{{ page.frontmatter.title }}</strong></p>
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
  grid-column: 1;
  grid-row: 1;
  margin: 15pt 0 0 0;
}

.layercontent {
  grid-column: 2;
  grid-row: 1;
  margin: 0 0 0 20pt;
}

.listImage {
  width: 180pt; /*or 70%, or what you want*/
  height: 100pt; /*or 70%, or what you want*/
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 6pt;
  border: 1px solid var(--vp-c-brand-soft);
  transition: all 1s ease-in-out;
}

.container_row:hover .listImage {
  transform: skew(-0deg, -4deg) rotate(2deg) scale(1.08);
}

.listImagebg {
  width: 180pt; /*or 70%, or what you want*/
  height: 100pt; /*or 70%, or what you want*/
  background-image: linear-gradient(-28deg, rgb(15, 196, 93) 50%, rgb(34, 188, 238) 50%);
  filter: blur(40pt);
  z-index: -10;
  transition: all 0.5s ease-in-out;
}

.container_row:hover .listImagebg {
  transform: skew(-1.5deg, -0.5deg) rotate(-0.4deg) scale(1.05);
  filter: blur(20pt);
}

</style>