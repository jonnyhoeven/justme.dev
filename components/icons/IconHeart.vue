<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
// Favourite heart. Colours via currentColor; `accent` tints a filled heart
// with the favourite colour (otherwise the parent's CSS colour applies).
withDefaults(
  defineProps<{
    filled?: boolean;
    // Draw a "+" inside the heart (only while not filled by the caller)
    plus?: boolean;
    accent?: boolean;
    size?: number | string;
  }>(),
  { filled: false, plus: false, accent: false, size: 14 }
);
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :style="filled && accent ? { color: 'var(--c-favorite)' } : undefined"
    stroke-width="2"
  >
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
    <path v-if="plus" d="M12 8.5v6M9 11.5h6" stroke-linecap="round" />
  </svg>
</template>
