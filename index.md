---
layout: home
title: Justme.dev
description: Justme.dev - Just make IT.
image: /images/ava.webp

hero:
  name: "Justme.dev"
  tagline: Just make IT!
  image:
    src: /images/ava.webp
    alt: Justme.dev
  actions:
    - theme: brand
      text: Projects
      link: /projects
    - theme: alt
      text: Blog
      link: /blog

features:
  - title: <a href="/projects/workshop">Kubernetes Git-Ops Workshop</a>
    details: <a href="/projects/workshop">This Workshop will help create your own Kubernetes cluster using K3S while using ArgoCD to deploy 
             your first application from a Git-Ops perspective.</a>
  - title: <a href="/projects/cvti">Camera & Lighting Interface</a>
    details: <a href="/projects/cvti"">This software is designed to control camera and
             lighting systems. The software is written in Visual Basic .NET and is designed to run on Windows operating systems.</a>
  - title: <a href="/projects/justme">Justme.dev</a>
    details: <a href="/projects/justme">This site's source code is available on GitHub. VitePress is specifically designed
             for static documentation websites. Built on top of Vue, a modern build tool for frontend development.</a>
---
<script setup>
import { data as pages } from './data/blog.data.js';
import ArticleList from '/components/ArticleList.vue';
</script>

<div class="homepage-content">

## Recent Posts

<div class="recent-posts">
  <ArticleList v-for="page of pages.slice(0, 3)" :key="page.url" :page="page"/>
</div>

<div class="action">
  <a class="VPButton medium brand" href="/blog">View all posts</a>
</div>

</div>

<style>
.homepage-content {
  margin-top: 4rem;
}

.action {
  margin-top: 2rem;
  text-align: center;
}
</style>
