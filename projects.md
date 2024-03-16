---
outline: deep
layout: home
---

<script setup>
import { data as projects} from './data/projects.data.js'
</script>

# Projects

These are some of the open source projects I have been involved in since 2014.

<div v-for="project of projects">
    <h2>{{project.frontmatter.title}}</h2>
    <a :href="project.url"><img alt="project.frontmatter.title" :src="project.frontmatter.image" class="listImage"></a>
    <p>
        <span v-html="project.excerpt"></span>
        <a :href="project.url" class="textButton">Read more...</a>
        <br/>
        <a target="_blank" 
           class="textButton"
           :href="project.frontmatter.githost + '/' + project.frontmatter.user + '/' + project.frontmatter.project"
        ><span class="VPBadge info shieldButton">🔗 View on GitHub</span></a>
        <img alt="Watchers" 
             class="shieldButton" 
             :src="'https://img.shields.io/github/watchers/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
        <img alt="Stars" 
             class="shieldButton" 
             :src="'https://img.shields.io/github/stars/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
        <img alt="Forks" 
             class="shieldButton" 
             :src="'https://img.shields.io/github/forks/' + project.frontmatter.user + '/' + project.frontmatter.project + '?style=flat'">
        <Badge type="info" :text="project.frontmatter.languages" class="shieldButton" style="margin-right:5pt"/>
    </p>   
</div>
