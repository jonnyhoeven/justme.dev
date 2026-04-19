<script setup lang="ts">
interface Frontmatter {
  watchersUrl?: string;
  starsUrl?: string;
  forksUrl?: string;
  langArr?: string[];
  externalUrl?: string;
  externalUrlLabel?: string;
  [key: string]: unknown;
}

defineProps<{
  frontmatter?: Frontmatter;
}>();
</script>

<template>
  <div v-if="frontmatter" class="badge-bar">
    <img
      v-if="frontmatter.watchersUrl"
      :src="frontmatter.watchersUrl"
      alt="Watchers"
      class="shieldButton"
      width="82px"
      height="20px"
    />
    <img
      v-if="frontmatter.starsUrl"
      :src="frontmatter.starsUrl"
      alt="Stars"
      class="shieldButton"
      width="60px"
      height="20px"
    />
    <img
      v-if="frontmatter.forksUrl"
      :src="frontmatter.forksUrl"
      alt="Forks"
      class="shieldButton"
      width="60px"
      height="20px"
    />
    <template v-if="frontmatter.langArr">
      <Badge
        v-for="lang of frontmatter.langArr"
        :key="lang"
        :text="lang"
        class="shieldButton"
        type="info"
        style="margin-right: 5pt"
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
</style>
