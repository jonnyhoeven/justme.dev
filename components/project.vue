<script setup>
//import {ref} from 'vue'

defineProps(['project'])
//const count = ref(0)

</script>

# {{ $frontmatter.title }}

{{ $frontmatter.intro }}
<template>
  <img :src="project.image" class="articleImage">


</template>


<!--<pre>{{article}}</pre>-->
<a :href="article.url" style="text-decoration:none; color:inherit;">
<h2>{{ article.frontmatter.title }}</h2>
<img alt="article.frontmatter.title" :src="article.frontmatter.image" class="listImage">
<p>
  <span v-html="article.excerpt"></span>

<a v-if="article.frontmatter.githost && article.frontmatter.project"
   target="_blank"
   class="textButton"
   :href="article.frontmatter.githost + '/' + article.frontmatter.user + '/' + article.frontmatter.project"
><span class="VPBadge info shieldButton">View on GitHub</span></a>
</p>
</a>

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