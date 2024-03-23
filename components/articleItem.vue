<script setup>
import BadgesComponent from '../components/badges.vue';

defineProps(['frontmatter'])
</script>

<template>
  <h1>{{ frontmatter.title }}</h1>

  <div class="container_row">
    <div class="articleImagebg layerbg"></div>
    <div class="layerimg">
      <div class="articleImage" :style="{backgroundImage: 'url('+ frontmatter.image +')'}"></div>
    </div>
  </div>

  <span v-html="frontmatter.intro"></span>
  <BadgesComponent :frontmatter="frontmatter"/>
  <div v-html="frontmatter.readme"></div>
</template>


<style>
.container_row {
  display: grid;
  padding: 10pt;
}

.layerbg, .layerimg {
  grid-column: 1;
  grid-row: 1;
}

.layerimg {
  margin: 15pt 20pt;
}

.layercontent {
  grid-column: 2;
  grid-row: 1;
}

.articleImage {
  width: 100%; /*or 70%, or what you want*/
  height: 250pt; /*or 70%, or what you want*/
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

.articleImagebg {
  width: 100%; /*or 70%, or what you want*/
  height: 250pt; /*or 70%, or what you want*/
  background-image: linear-gradient(-28deg, rgb(15, 196, 93) 50%, rgb(34, 188, 238) 50%);
  filter: blur(25pt);
  z-index: -10;
}

</style>