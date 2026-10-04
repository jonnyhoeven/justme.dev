import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { dotSize } from './utils';

/**
 * Copper bars (Amiga raster-bar style): horizontal bands of beads sweep up and
 * down on offset sines. Every bead keeps its own avatar colour; bass and kicks
 * only make the bars thicker.
 */

const BARS = 6;
const BAR_THICKNESS = 0.1; // of the area height
const SWEEP = 0.3; // of the area height
const BASS_SWELL = 0.5;
const BEAT_SWELL = 0.9;

let total = 1;
let perBar = 1;
let rows = 1;
let colStep = 10;
let size = 1;
let left = 0;
let width = 1;
let thick = 40;
let time = 0;
let phase = 0;
let ripple = 0.2;
const barY: number[] = Array.from({ length: BARS }, () => 0);

export const copperBars: SplatScene = {
  name: 'Copper Bars',
  alpha: 0.85,
  glow: 0.9,

  glowRect(ctx, out) {
    // The glow stretches into one wide bar through the middle of the hero
    out.x = ctx.areaX + ctx.areaW / 2;
    out.y = ctx.areaY + ctx.areaH / 2;
    out.w = ctx.areaW * 0.95;
    out.h = ctx.areaH * 0.15;
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
    time = phase;
    ripple = 0.2 + mid * 0.7;
    const baseThick = ctx.areaH * BAR_THICKNESS;
    thick = baseThick * (1 + bass * BASS_SWELL + beat * BEAT_SWELL);

    // Beads in full-width rows, sized so the bar reads as solid. Rows are
    // interleaved (particle k -> row k % rows) so every row spans the whole
    // width, whatever perBar is.
    rows = Math.max(2, Math.round(Math.sqrt((perBar * baseThick) / ctx.areaW)));
    left = ctx.areaX;
    width = ctx.areaW;
    colStep = (ctx.areaW * rows) / perBar;
    size = dotSize(Math.min(colStep, baseThick / rows) * 0.6, ctx);

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

  target(_p, i, _elapsed, _ctx, out) {
    const b = Math.min(BARS - 1, Math.floor(i / perBar));
    const k = i - b * perBar;
    const barCount = Math.min(perBar, total - b * perBar);
    const row = k % rows;
    const col = Math.floor(k / rows);
    const u = (row / (rows - 1)) * 2 - 1;

    out.x =
      left +
      ((col + 0.5) / (barCount / rows)) * width +
      Math.sin(time * 0.002 + col * 0.35 + b) * colStep * ripple;
    out.y = barY[b] + (u * thick) / 2;
    out.sizeMult = size;
  }
};
