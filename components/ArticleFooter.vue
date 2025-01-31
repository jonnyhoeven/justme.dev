<script setup>
defineProps(['frontmatter'])
</script>

<template>
  <small v-if="frontmatter && frontmatter.model"><i>Content created using: {{ frontmatter.model }}</i></small>
</template>
