<script setup>
defineProps(['frontmatter'])
</script>

<template>
  <small v-if="frontmatter && frontmatter.model && frontmatter.total_tokens"><i>Content created using: {{ frontmatter.model }}
    costing {{ frontmatter.total_tokens }} tokens total.</i></small>
</template>
