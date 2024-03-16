---
outline: deep
layout: home
---

<script setup>
import { data as projects} from './data/projects.data.js'
</script>

# Projects

This is a selection of open source projects I have worked on since 2014.

<span v-for="project of projects">
<h2><a :href="project.url">{{project.frontmatter.title}}</a></h2>
<a :href="project.url"><img alt="project.title" :src="project.frontmatter.image" style="height:90pt; margin: 5pt 15pt 10pt 0; border:0;" align="left"></a>
<p v-html="project.frontmatter.description"></p>
<img alt="Watchers" style="padding-right: 5pt; float:right" :src="'https://img.shields.io/github/watchers/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
<img alt="Stars" style="padding-right: 5pt; float:right" :src="'https://img.shields.io/github/stars/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
<img alt="Forks" style="padding-right: 5pt; float:right" :src="'https://img.shields.io/github/forks/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
<Badge type="info" :text="project.frontmatter.languages" style="float:right"/>

<span style="float:right;">
{{new Date(project.frontmatter.date).toLocaleDateString()}} |
</span>
<!--<a :href="project.url">Read More</a> | -->
<a :href="project.frontmatter.githost + '/' + project.frontmatter.user + '/' + project.frontmatter.project" target="_blank">View on Git</a>
</span>
