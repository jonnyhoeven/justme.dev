---
layout: home
title: Justme.dev
description: Justme.dev - Just make it!
image: /images/ava.webp

hero:
  name: 'Justme.dev'
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
  - title: Kubernetes Git-Ops Workshop
    details:
      Build a custom Kubernetes cluster using K3s and ArgoCD. This workshop guides
      you through your first application deployment using a professional GitOps workflow.
    link: /projects/workshop
  - title: FastTracker II & Chiptune Archive
    details:
      Interactive Web Audio player and real-time visualizer for 3,000+ tracker songs.
      Inspect multi-channel oscilloscopes, live pattern sequences, instruments, and samples.
    link: /blog/tracker
  - title: Justme.dev
    details:
      Open-source documentation powered by VitePress. This site leverages Vue.js and
      modern frontend build tools to deliver a high-performance, static web experience.
    link: /projects/justme
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
  <a class="view-all-button flourish" href="/blog">View all posts</a>
</div>

</div>
