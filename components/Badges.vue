<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { computed } from 'vue';
import type { ArticleFrontmatter } from '../types/frontmatter';
import { formatCount } from '../lib/formatCount';

const props = defineProps<{
  frontmatter?: ArticleFrontmatter;
}>();

const stats = computed(() => {
  const fm = props.frontmatter;
  if (!fm) return [];
  return [
    {
      key: 'watchers',
      icon: '\u{1F441}',
      label: 'Watchers',
      value: fm.watchers
    },
    { key: 'stars', icon: '\u2605', label: 'Stars', value: fm.stars },
    { key: 'forks', icon: '\u2442', label: 'Forks', value: fm.forks }
  ]
    .map((s) => ({ ...s, text: formatCount(s.value) }))
    .filter((s) => s.text !== '');
});
</script>

<template>
  <div v-if="frontmatter" class="badge-bar">
    <span
      v-for="stat of stats"
      :key="stat.key"
      class="shieldButton stat-pill"
      :title="`${stat.label}: ${stat.value}`"
    >
      <span class="stat-icon" aria-hidden="true">{{ stat.icon }}</span>
      <span class="visually-hidden">{{ stat.label }}</span>
      <span class="stat-value">{{ stat.text }}</span>
    </span>
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
    <a
      target="_blank"
      class="textButton"
      v-if="
        frontmatter.gitlink &&
        frontmatter.externalUrl &&
        frontmatter.gitlink !== frontmatter.externalUrl
      "
      :href="frontmatter.gitlink"
      :aria-label="
        frontmatter.gitlink.includes('github.com')
          ? 'View on GitHub'
          : 'View source repository'
      "
      rel="noopener noreferrer"
    >
      <Badge
        :text="
          frontmatter.gitlink.includes('github.com')
            ? 'View on Github'
            : 'View source'
        "
        type="info"
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
.stat-pill {
  gap: 4px;
  padding: 0 8px;
  height: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}
.stat-icon {
  color: var(--vp-c-brand-1);
}
.stat-value {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.langBadge {
  margin-right: 6px;
}
</style>
