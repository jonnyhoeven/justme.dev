<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import type { ArticleFrontmatter } from '../types/frontmatter';

defineProps<{
  frontmatter?: ArticleFrontmatter;
}>();
</script>

<template>
  <div v-if="frontmatter" class="badge-bar">
    <img
      v-if="frontmatter.watchersUrl"
      :src="frontmatter.watchersUrl"
      alt="Watchers"
      class="shieldButton"
      width="82"
      height="20"
    />
    <img
      v-if="frontmatter.starsUrl"
      :src="frontmatter.starsUrl"
      alt="Stars"
      class="shieldButton"
      width="60"
      height="20"
    />
    <img
      v-if="frontmatter.forksUrl"
      :src="frontmatter.forksUrl"
      alt="Forks"
      class="shieldButton"
      width="60"
      height="20"
    />
    <template v-if="frontmatter.langArr">
      <Badge
        v-for="lang of frontmatter.langArr"
        :key="lang"
        :text="lang"
        class="shieldButton langBadge"
        type="info"
      />
    </template>
    <a
      target="_blank"
      class="textButton"
      v-if="frontmatter.externalUrl"
      :href="frontmatter.externalUrl"
      :aria-label="
        'External link to ' + (frontmatter.externalUrlLabel || 'project')
      "
      rel="noopener noreferrer"
    >
      <Badge
        :text="frontmatter.externalUrlLabel"
        type="tip"
        class="shieldButton"
      />
    </a>
  </div>
</template>

<style scoped>
.textButton {
  display: inline-block;
  border-radius: 4px;
}
.textButton:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #3498db);
  outline-offset: 2px;
}
.langBadge {
  margin-right: 6px;
}
</style>
