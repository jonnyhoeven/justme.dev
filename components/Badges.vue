<script setup lang="ts">
defineProps(['frontmatter'])
</script>

<template>
  <div v-if="frontmatter" class="badge-bar">
    <img v-if="frontmatter.watchersUrl" :src="frontmatter.watchersUrl" alt="Watchers" class="shieldButton" width="82px"
      height="20px" />
    <img v-if="frontmatter.starsUrl" :src="frontmatter.starsUrl" alt="Stars" class="shieldButton" width="60px"
      height="20px" />
    <img v-if="frontmatter.forksUrl" :src="frontmatter.forksUrl" alt="Forks" class="shieldButton" width="60px"
      height="20px" />
    <template v-if="frontmatter.langArr">
      <Badge v-for="lang of frontmatter.langArr" :key="lang" :text="lang" class="shieldButton" type="info"
        style="margin-right:5pt" />
    </template>
    <a target="_blank" class="textButton" v-if="frontmatter.externalUrl" :href="frontmatter.externalUrl">
      <Badge :text="frontmatter.externalUrlLabel" type="tip" class="shieldButton" style="margin-right:5pt" />
    </a>
  </div>
</template>

<style>
.badge-bar {
  margin: 10pt 0 20pt 0;
  position: relative;
  z-index: 2;
}

.shieldButton {
  margin-top: 12pt;
  margin-right: 3pt;
  float: right;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.shieldButton:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 12px rgba(99, 102, 241, 0.2);
  border-radius: 4px; /* Ensure uniform shadow wrap */
}
</style>