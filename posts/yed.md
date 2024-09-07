---
date: 2021-08-01
editLink: false
externalUrl: https://www.yworks.com/products/yed
fetchML: false
fetchReadme: false
image: /images/yed.webp
messages:
- content: 'You''re a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences, don''t use
    "*". Desired format: Intro: -||- BlogPost: -||-'
  role: system
- content: 'Write a blog post about Yed and what it means for structuring drawing infrastructure based on the following github
    readme: yEd is a general-purpose diagramming program with a multi-document interface. It is a cross-platform application
    written in Java that runs on Windows, Linux, Mac OS, and other platforms that support the Java Virtual Machine. It is
    released under a proprietary software license, that allows using a single copy gratis. yEd is a powerful desktop application
    that can be used to quickly and effectively generate high-quality diagrams. It runs on all Windows, Unix/Linux, and Mac
    OS versions.'
  role: user
model: openchat/openchat-3.5-1210
title: yEd
type: post
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>



<ArticleFooter :frontmatter="$frontmatter"/>
