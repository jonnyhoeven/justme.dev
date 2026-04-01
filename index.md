---
layout: home
title: Justme.dev
description: Justme.dev - Just make it!
image: /images/ava.webp

hero:
  name: "Justme.dev"
  tagline: Just make it!
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
  <a class="view-all-button" href="/blog">View all posts</a>
</div>

</div>

<style>
.homepage-content {
  margin-top: 8rem;
}

.action {
  margin-top: 4rem;
  text-align: center;
}

.view-all-button {
  display: inline-block;
  padding: 0.8rem 2rem;
  background-color: var(--vp-c-brand-1);
  color: #ffffff !important;
  border-radius: 9999px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--vp-font-family-base);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.view-all-button:hover {
  background-color: var(--vp-c-brand-2);
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.4);
}

.view-all-button:active {
  transform: translateY(0) scale(0.98);
}
</style>
