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
           class="shieldButton"
           type="info"
           style="margin-right:5pt"
    />


    <a target="_blank"
       class="textButton"
       :href="frontmatter.externalUrl"
    >
      <Badge text="View on GitHub"
             type="tip"
             class="shieldButton"
             style="margin-right:5pt"
      />
    </a>
  </div>
</template>

<style>

.VPBadge .shieldButton {

}

.badge-bar {
  margin: 10pt 0 20pt 0;
}
.shieldButton {
  margin-top: 12pt;
  margin-right: 3pt;
  float: right;
}
</style>