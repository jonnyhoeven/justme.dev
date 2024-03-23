<script setup>
import BadgesComponent from '/components/badges.vue';
defineProps(['page']);
</script>

<template v-if="page">
  <a :href="page.frontmatter.url" style="text-decoration:none; color:inherit;">
    <h2>{{ page.title }}</h2>
    <img alt="page.frontmatter.title" :src="page.frontmatter.image" class="listImage">
    <p>
      <span v-html="page.frontmatter.intro"></span>
      <BadgesComponent :frontmatter="page.frontmatter" />
    </p>
  </a>
</template>

<style>
.listImage {
  width: 130pt;
  margin: 5pt 15pt 10pt 0;
  border: 0;
  float: left;
}
</style>