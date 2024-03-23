<script setup>
defineProps(['frontmatter'])
</script>

<template>
  <div class="badge-bar">
    <img :src=frontmatter.watchersUrl
         class="shieldButton"
         alt="Watchers"
    >
    <img :src="frontmatter.starsUrl"
         alt="Stars"
         class="shieldButton"
    >
    <img :src="frontmatter.forksUrl"
         alt="Forks"
         class="shieldButton"
    >
    <Badge v-for="lang of frontmatter.langArr" :text="lang"
           type="info"
           class="shieldButton"
           style="margin-right:5pt"
    />
    <a target="_blank"
       class="textButton"
       :href="frontmatter.externalUrl"
    >
      <span class="VPBadge shieldButton">View on GitHub</span>
    </a>
  </div>
</template>

<style>
.badge-bar {
  margin: 10pt 0 20pt 0;
}
.shieldButton {
  margin-top: 12pt;
  margin-right: 3pt;
  float: right;
}
</style>