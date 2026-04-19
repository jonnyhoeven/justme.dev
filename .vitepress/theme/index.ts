// https://vitepress.dev/guide/custom-theme
// noinspection JSUnusedGlobalSymbols

import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import './style.css';
import HeroSplat from './components/HeroSplat.vue';
import MusicEasterEgg from './components/MusicEasterEgg.vue';

// noinspection JSUnusedLocalSymbols
export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroSplat),
      'nav-bar-content-before': () => h(MusicEasterEgg)
    });
  },
  enhanceApp({}) {
    // ...
  }
} satisfies Theme;
