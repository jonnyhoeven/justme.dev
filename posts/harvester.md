---
branch: master
date: 2023-04-13
editLink: false
fetchML: false
fetchReadme: false
githost: https://github.com
image: /images/harvester.webp
languages: Go, Shell, Other
messages:
- content: 'You are a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences. Desired
    format: Intro: -||- BlogPost: -||-'
  role: system
- content: 'Write a blog post about harvester and what it does, how it can be used for edge networks. based on the following
    github readme: Harvester is a modern, open, interoperable, hyperconverged infrastructure  (HCI) solution built on Kubernetes.
    It is an open-source alternative designed for operators seeking a cloud-native  HCI solution. Harvester runs on bare metal
    servers and provides integrated virtualization and distributed storage  capabilities. In addition to traditional virtual
    machines (VMs), Harvester supports containerized environments  automatically through integration with Rancher. '
  role: user
model: google/gemma-7b-it
project: harvester
title: Harvester
type: post
user: harvester
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>



<ArticleFooter :frontmatter="$frontmatter"/>
