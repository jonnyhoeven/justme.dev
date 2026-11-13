<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    size?: number;
    label?: string;
    compact?: boolean;
  }>(),
  {
    modelValue: 0,
    size: 13,
    label: '',
    compact: false
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', rating: number): void;
}>();

const hoverRating = ref(0);

const onStarClick = (n: number) => {
  const nextRating = props.modelValue === n ? 0 : n;
  emit('update:modelValue', nextRating);
};

const isFilled = (n: number) => {
  if (hoverRating.value > 0) {
    return hoverRating.value >= n;
  }
  return props.modelValue >= n;
};

const getAriaLabel = (n: number) => {
  const target = props.label ? ` for ${props.label}` : '';
  if (props.modelValue === n) {
    return `Remove ${n} star rating${target}`;
  }
  return `Rate ${n} star${n === 1 ? '' : 's'}${target}`;
};
</script>

<template>
  <div
    class="star-rating"
    :class="{ compact }"
    role="group"
    :aria-label="label ? `Rating for ${label}` : 'Star rating'"
    @mouseleave="hoverRating = 0"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="star-btn"
      :class="{ filled: isFilled(n) }"
      :aria-label="getAriaLabel(n)"
      :aria-pressed="modelValue >= n"
      @click.stop="onStarClick(n)"
      @mouseenter="hoverRating = n"
    >
      <svg
        viewBox="0 0 24 24"
        :width="size"
        :height="size"
        :fill="isFilled(n) ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="star-icon"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  vertical-align: middle;
}

.star-rating.compact {
  gap: 1px;
}

.star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 2px;
  margin: 0;
  cursor: pointer;
  color: var(--vp-c-text-3);
  border-radius: 3px;
  transition:
    color 0.15s ease,
    transform 0.1s ease;
  line-height: 1;
  min-width: 14px;
  min-height: 14px;
}

.compact .star-btn {
  padding: 1px;
  min-width: 12px;
  min-height: 12px;
}

.star-btn.filled {
  color: var(--c-star, #f59e0b);
}

.star-btn:hover {
  transform: scale(1.15);
}

.star-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #6366f1);
  outline-offset: 1px;
}

.star-icon {
  display: block;
  flex-shrink: 0;
}
</style>
