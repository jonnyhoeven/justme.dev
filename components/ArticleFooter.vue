<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import type { ArticleFrontmatter } from '../types/frontmatter';

defineProps<{
  frontmatter?: ArticleFrontmatter;
}>();
</script>

<template>
  <small v-if="frontmatter && frontmatter.model"
    ><i>Content created using: {{ frontmatter.model }}</i></small
  >
</template>
