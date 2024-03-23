<script setup>
import Badges from './Badges.vue';

defineProps(['frontmatter'])
</script>

<template>
  <h1>{{ frontmatter.title }}</h1>
  <div class="container_row">
    <div class="articleImagebg layerbg"></div>
    <div class="layerimg">
      <div class="articleImage" :style="{backgroundImage: 'url('+ frontmatter.image +')'}"></div>
      <Badges :frontmatter="frontmatter"/>
    </div>
  </div>
  <p v-html="frontmatter.intro"></p>
  <p v-html="frontmatter.readme"></p>
</template>


<style>
.container_row {
  display: grid;
  padding: 10pt;
}

.layerbg, .layerimg {
  grid-column: 1;
  grid-row: 1;
  margin: 15pt 20pt 10pt 0;
}

.articleImage {
  width: 100%; /*or 70%, or what you want*/
  height: 250pt; /*or 70%, or what you want*/
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid var(--vp-c-brand-soft);
  transition: all 1.5s ease-out;
  border-radius: 6pt;
}

.container_row:hover .articleImage {
  transform: skew(-0.5deg, -0.5deg) rotate(-0.4deg) scale(1.04);
}

.articleImagebg {
  width: 100%; /*or 70%, or what you want*/
  height: 250pt; /*or 70%, or what you want*/
  z-index: -10;
  transition: all 1s ease-in-out;
  background: linear-gradient(45deg, #22bcee, #0fc45d, #99cde1, #0c5e83);
  background-size: 800% 800%;
  filter: blur(35pt);

  -webkit-animation: glow 20s ease infinite;
  -moz-animation: glow 20s ease infinite;
  animation: glow 20s ease infinite;
}

.container_row:hover .articleImagebg {
  transform: skew(-1.5deg, -0.5deg) rotate(-0.5deg) scale(1.04);
  filter: blur(20pt);
}

@-webkit-keyframes glow {
  0% {
    background-position: 4% 0%
  }
  50% {
    background-position: 97% 100%
  }
  100% {
    background-position: 4% 0%
  }
}

@-moz-keyframes glow {
  0% {
    background-position: 4% 0%
  }
  50% {
    background-position: 97% 100%
  }
  100% {
    background-position: 4% 0%
  }
}

@keyframes glow {
  0% {
    background-position: 4% 0%
  }
  50% {
    background-position: 97% 100%
  }
  100% {
    background-position: 4% 0%
  }
}


</style>