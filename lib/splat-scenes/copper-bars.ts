// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';
import { dotSize, setHsl } from './utils';

/**
 * Copper bars (Amiga raster-bar style): ribbons of fat, overlapping beads
 * sweep up and down on offset sines, bending in a travelling wave. Each
 * ribbon is two staggered rows (lit top, shaded bottom) in a muted indigo
 * range, so it reads as one solid tube; bass and kicks only make the bars
 * thicker.
 */

const BARS = 6;
const ROWS = 2;
const SWEEP = 0.3; // of the area height
const BASS_SWELL = 0.5;
const BEAT_SWELL = 0.9;
// Bead radius as a fraction of the column pitch: > 0.5 so neighbours overlap
const BEAD = 0.66;
const OVERSCAN = 0.03; // of the area width, each side

let total = 1;
let perBar = 1;
let colStep = 10;
let radius = 10;
let rowGap = 12;
let left = 0;
let width = 1;
let phase = 0;
let bend = 0.2;
let dark = true;
const barY: number[] = Array.from({ length: BARS }, () => 0);

export const copperBars: SplatScene = {
  name: 'Copper Bars',
  alpha: 0.85,
  glow: 0.65,

  glowRect(ctx, out) {
    // A soft wash that follows the ribbons: it spans the band they currently
    // sweep through, so the glow sits behind the bars instead of between them
    let lo = Infinity;
    let hi = -Infinity;
    for (const y of barY) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
    const pad = rowGap + radius * 2;
    out.x = ctx.areaX + ctx.areaW / 2;
    out.y = (lo + hi) / 2;
    out.w = ctx.areaW * 0.95;
    out.h = Math.max(ctx.areaH * 0.3, hi - lo + pad * 2);
  },

  init(particles: SplatParticle[]) {
    total = particles.length;
    perBar = Math.ceil(total / BARS);
    phase = 0;
  },

  beforeFrame(_elapsed, ctx) {
    const { bass, mid, volume, beat } = ctx.audioLevels;
    // Integrated so the sweep speeds up with the music without jumping
    phase += ctx.dt * (1 + volume * 1.5 + beat * 3);
    bend = 0.35 + mid * 0.6;
    dark = isDarkTheme();

    // Beads sit in ROWS staggered rows across the full width; the pitch sets
    // the bead size, so a ribbon is always solid whatever the area width
    colStep = (ctx.areaW * ROWS) / perBar;
    const baseRadius = colStep * BEAD;
    radius = baseRadius * (1 + beat * 0.3);
    rowGap = baseRadius * 1.1 * (1 + bass * BASS_SWELL + beat * BEAT_SWELL);
    left = ctx.areaX;
    width = ctx.areaW;

    const cy = ctx.areaY + ctx.areaH / 2;
    for (let b = 0; b < barY.length; b++) {
      barY[b] =
        cy +
        Math.sin(phase * 0.0011 + b * 0.9) *
          ctx.areaH *
          SWEEP *
          (1 + beat * 0.25) +
        Math.sin(phase * 0.0007 + b * 1.7) * ctx.areaH * 0.07;
    }
  },

  target(_p, i, _elapsed, ctx, out) {
    // Beads are dealt round-robin to the bars so their counts differ by at
    // most one, and each bar spreads its own count over the full width: no
    // ribbon falls short of the right edge when total % BARS != 0
    const b = i % BARS;
    const k = Math.floor(i / BARS);
    const count = Math.floor((total - 1 - b) / BARS) + 1;
    const row = k % ROWS;
    const col = Math.floor(k / ROWS);
    const cols = Math.ceil(count / ROWS);
    // Overscan a little past both edges so the ribbons run off-screen
    const along = (col + 0.5 + row / ROWS / 2) / (cols + 0.25);
    const x = left + (along * (1 + 2 * OVERSCAN) - OVERSCAN) * width;

    out.x = x;
    out.y =
      barY[b] +
      (row - (ROWS - 1) / 2) * rowGap +
      Math.sin(phase * 0.002 + x * 0.006 + b) * rowGap * bend;
    out.sizeMult = dotSize(radius, ctx);

    // Muted indigo, a slightly different hue per bar. The top row is lit and
    // the bottom shaded; a soft sheen runs along each ribbon.
    const sheen = Math.sin(x * 0.004 - phase * 0.0015 + b) * 0.05;
    const lit = row === 0;
    const light = (dark ? (lit ? 0.68 : 0.5) : lit ? 0.6 : 0.46) + sheen;
    setHsl(out, 0.63 + (b / (BARS - 1)) * 0.09, 0.55, light);
  }
};
