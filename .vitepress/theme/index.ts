// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import './style.css';
import HeroSplat from '../../components/HeroSplat.vue';
import MiniPlayer from '../../components/MiniPlayer.vue';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroSplat),
      'nav-bar-content-before': () => h(MiniPlayer)
    });
  }
} satisfies Theme;
