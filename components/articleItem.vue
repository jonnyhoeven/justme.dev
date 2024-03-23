<script setup>
import BadgesComponent from '../components/badges.vue';
defineProps(['frontmatter'])
</script>

<template>

  <h1>{{ frontmatter.title }}</h1>
  <p>{{ frontmatter.intro }}</p>

  <img :src="frontmatter.image" class="articleImage">
  <BadgesComponent :frontmatter="frontmatter"/>

  <div v-html="frontmatter.readme"></div>
</template>