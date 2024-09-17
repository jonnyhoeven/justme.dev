---
branch: master
date: 2023-04-14
editLink: false
fetchML: false
fetchReadme: false
githost: https://github.com
image: /images/qmk.webp
languages: C, C++, Makefile, Python, Shell, Nix
messages:
- content: 'You are a developer writing a blog, Intro using 4 to 6 sentences, Blog Post using 12 to 15 sentences. Desired
    format: Intro: -||- BlogPost: -||-'
  role: system
- content: 'Write a blog post about QMK (Quantum Mechanical Keyboard) based on the following github readme: QMK (Quantum Mechanical
    Keyboard) is an open source community centered  around developing computer input devices. The community encompasses all
    sorts of input devices,  such as keyboards, mice, and MIDI devices. A core group of collaborators maintains QMK Firmware,  QMK
    Configurator, QMK Toolbox, qmk.fm, and this documentation with the help of community members like you. QMK has lots of
    features to explore, and a good deal of reference documentation to dig through.  Most features are taken advantage of
    by modifying your keymap, and changing the keycodes.'
  role: user
model: google/gemma-7b-it
project: qmk_firmware
title: Quantum Mechanical Keyboard
type: post
user: qmk
---
<script setup>
 import ArticleItem from '/components/ArticleItem.vue';
 import ArticleFooter from '/components/ArticleFooter.vue';
</script>
<ArticleItem :frontmatter="$frontmatter"/>



<ArticleFooter :frontmatter="$frontmatter"/>