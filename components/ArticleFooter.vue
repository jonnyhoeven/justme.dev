<script setup lang="ts">
interface Frontmatter {
  model?: string;
  [key: string]: unknown;
}

defineProps<{
  frontmatter?: Frontmatter;
}>();
</script>

<template>
  <small v-if="frontmatter && frontmatter.model"
    ><i>Content created using: {{ frontmatter.model }}</i></small
  >
</template>
