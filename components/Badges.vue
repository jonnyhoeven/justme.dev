<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { computed } from 'vue';
import type { ArticleFrontmatter } from '../types/frontmatter';
import { formatCount } from '../lib/formatCount';

const props = defineProps<{
  frontmatter?: ArticleFrontmatter;
}>();

const STAT_ICONS = {
  watchers:
    'M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z',
  stars:
    'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z',
  forks:
    'M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z'
} as const;

const stats = computed(() => {
  const fm = props.frontmatter;
  if (!fm) return [];
  return [
    {
      key: 'watchers',
      iconPath: STAT_ICONS.watchers,
      label: 'Watchers',
      value: fm.watchers
    },
    {
      key: 'stars',
      iconPath: STAT_ICONS.stars,
      label: 'Stars',
      value: fm.stars
    },
    {
      key: 'forks',
      iconPath: STAT_ICONS.forks,
      label: 'Forks',
      value: fm.forks
    }
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
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="currentColor"
        aria-hidden="true"
        class="stat-icon"
      >
        <path :d="stat.iconPath" />
      </svg>
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
  border-radius: var(--radius-full, 9999px);
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
  border-radius: var(--radius-full, 9999px);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}
.stat-icon {
  display: block;
  flex-shrink: 0;
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
