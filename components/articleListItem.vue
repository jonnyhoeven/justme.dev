<script setup>
import BadgesComponent from '/components/badges.vue';

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
        <BadgesComponent :frontmatter="page.frontmatter"/>
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
  margin: 10pt 0 20pt 0;
  padding: 10pt;
}

.layerbg, .layerimg {
  grid-column: 1;
  grid-row: 1;
  margin: 15pt 20pt 20pt 0pt;
}

.layercontent {
  grid-column: 2;
  grid-row: 1;
}

.listImage {
  width: 180pt; /*or 70%, or what you want*/
  height: 100pt; /*or 70%, or what you want*/
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 6pt;
  border: 1px solid var(--vp-c-brand-soft);
  transition: all .3s ease-out;
}

.container_row:hover .listImage {
  scale: 1.03;
}

.listImagebg {
  width: 180pt; /*or 70%, or what you want*/
  height: 100pt; /*or 70%, or what you want*/
  background-image: linear-gradient(-28deg, rgb(15, 196, 93) 50%, rgb(34, 188, 238) 50%);
  filter: blur(25pt);
  z-index: -10;
}
</style>