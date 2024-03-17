<script setup>
//import {ref} from 'vue'

defineProps(['article'])
//const count = ref(0)

</script>

<template>
 <!--<pre>{{article}}</pre>-->
  <a :href="article.url" style="text-decoration:none; color:inherit;">
    <h2>{{ article.frontmatter.title }}</h2>
    <img alt="article.frontmatter.title" :src="article.frontmatter.image" class="listImage">
    <p>
      <span v-html="article.excerpt"></span>
    <div class="article-bar">
      <img alt="Watchers"
           class="shieldButton"
           :src="'https://img.shields.io/github/watchers/' + article.urlSnippet + '?style=flat'">
      <img alt="Stars"
           class="shieldButton"
           :src="'https://img.shields.io/github/stars/' + article.urlSnippet + '?style=flat'">
      <img alt="Forks"
           class="shieldButton"
           :src="'https://img.shields.io/github/forks/' + article.urlSnippet + '?style=flat'">
      <Badge type="info" :text="article.frontmatter.languages" class="shieldButton" style="margin-right:5pt"/>
    </div>
    <a v-if="article.frontmatter.githost && article.frontmatter.project_name"
       target="_blank"
       class="textButton"
       :href="article.frontmatter.githost + '/' + article.frontmatter.user + '/' + article.frontmatter.project_name"
    ><span class="VPBadge info shieldButton">View on GitHub</span></a>
    </p>
  </a>
</template>

<style>
.article-bar {
  padding-top: 10pt;
}
.listImage {
  width: 130pt;
  margin: 5pt 15pt 10pt 0;
  border: 0;
  float: left;
}
.shieldButton {
  margin-top: 10pt;
  padding-right: 5pt;
  float: right;
}
</style>