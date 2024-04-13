<script setup>
defineProps(['frontmatter'])
</script>

<template>
  <div
      class="badge-bar">
    <img v-if="frontmatter.watchersUrl"
         :src=frontmatter.watchersUrl
         alt="Watchers"
         class="shieldButton"
    />
    <img v-if="frontmatter.starsUrl" :src="frontmatter.starsUrl"
         alt="Stars"
         class="shieldButton"
    />
    <img v-if="frontmatter.forksUrl" :src="frontmatter.forksUrl"
         alt="Forks"
         class="shieldButton"
    />
    <Badge v-for="lang of frontmatter.langArr" :text="lang"
           class="shieldButton"
           type="info"
           style="margin-right:5pt"
    />
    <a target="_blank"
       class="textButton"
       v-if="frontmatter.externalUrl"
       :href="frontmatter.externalUrl"
    >
      <Badge :text="frontmatter.externalUrlLabel"
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