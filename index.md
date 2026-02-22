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
    details: <a href="/projects/workshop">Build a custom Kubernetes cluster using K3s and ArgoCD. This workshop guides
      you through your first application deployment using a professional GitOps workflow.</a>
  - title: <a href="/projects/top-40-crawl">AI-Driven Metadata Enrichment Pipeline</a>
    details: <a href="/projects/top-40-crawl"">This project implements a scalable, cloud-native ETL (Extract, Transform, Load)
      pipeline designed to aggregate, enrich, and persist historical music chart data spanning over six decades (1965–Present).</a>
  - title: <a href="/projects/justme">Justme.dev</a>
    details: <a href="/projects/justme"> Open-source documentation powered by VitePress. This site leverages Vue.js and
      modern frontend build tools to deliver a high-performance, static web experience.</a>
---

<script setup>
import { data as pages } from './data/blog.data.js';
import ArticleList from './components/ArticleList.vue';
</script>

<div class="homepage-content">

## Recent Posts

<div class="recent-posts">
  <ArticleList v-for="page of pages.slice(0, 4)" :key="page.url" :page="page"/>
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
