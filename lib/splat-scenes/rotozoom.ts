// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';
import { setColor } from './utils';

/**
 * Rotozoomer: particles form a dot-matrix grid whose colours are sampled from
 * the avatar itself through a rotating, zooming transform, so the face tiles
 * and spins across the whole hero.
 */

const TEX = 32;
const TEX_CELL = 320 / TEX;
const EMPTY = [22, 26, 40];

const texture = new Uint8Array(TEX * TEX * 3);
let count = 1;
let cols = 1;
let rows = 1;
let spacing = 20;
let pitchX = 20;
let pitchY = 20;
let gridX = 0;
let gridY = 0;
let cosA = 1;
let sinA = 0;
let zoom = 1;
let tile = 300;
let angle = 0;
let gain = 1;
let invTileZoom = 1;
let sizeMult = 1;
let midX = 0;
let midY = 0;

export const rotozoom: SplatScene = {
  name: 'Rotozoom',
  alpha: 0.8,
  glow: 0,

  init(particles: SplatParticle[]) {
    count = particles.length;
    angle = 0;
    // Bin the avatar particles into a small colour texture
    const sum = new Float32Array(TEX * TEX * 4);
    for (const p of particles) {
      const tx = Math.min(TEX - 1, Math.max(0, Math.floor(p.ox / TEX_CELL)));
      const ty = Math.min(TEX - 1, Math.max(0, Math.floor(p.oy / TEX_CELL)));
      const k = (ty * TEX + tx) * 4;
      sum[k] += p.cr;
      sum[k + 1] += p.cg;
      sum[k + 2] += p.cb;
      sum[k + 3]++;
    }
    for (let c = 0; c < TEX * TEX; c++) {
      const n = sum[c * 4 + 3];
      for (let ch = 0; ch < 3; ch++) {
        texture[c * 3 + ch] = n ? sum[c * 4 + ch] / n : EMPTY[ch];
      }
    }
  },

  beforeFrame(elapsed, ctx) {
    const targetAspect = Math.max(1e-4, ctx.areaW) / Math.max(1e-4, ctx.areaH);
    let bestRows = 1;
    let bestCols = count;
    let bestDiff = Infinity;
    for (let r = 1; r <= count; r++) {
      if (count % r === 0) {
        const c = count / r;
        const gridAspect = c / r;
        const diff = Math.abs(Math.log(gridAspect / targetAspect));
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRows = r;
          bestCols = c;
        }
      }
    }
    rows = bestRows;
    cols = bestCols;
    // The particle count only allows a few grid shapes, so stretch the pitch
    // to fill the area edge to edge instead of leaving empty borders. Dots
    // stay round, sized by the tighter pitch.
    pitchX = ctx.areaW / cols;
    pitchY = ctx.areaH / rows;
    spacing = Math.min(pitchX, pitchY);
    gridX = ctx.areaX + pitchX / 2;
    gridY = ctx.areaY + pitchY / 2;

    const { beat, volume } = ctx.audioLevels;
    angle += ctx.dt * (0.0004 + volume * 0.0012 + beat * 0.0015);
    cosA = Math.cos(angle);
    sinA = Math.sin(angle);
    zoom = 0.9 + Math.sin(elapsed * 0.0006) * 0.5 - beat * 0.18;
    // Lighter on a dark page, darker on a light one, so the pulse always has contrast
    gain = isDarkTheme()
      ? 1 + beat * 0.55 + volume * 0.2
      : 1 - beat * 0.4 - volume * 0.1;
    tile = ctx.areaH;
    invTileZoom = 1 / (tile * zoom);
    sizeMult = (spacing * 0.041) / ctx.scale;
    midX = ctx.areaX + ctx.areaW / 2;
    midY = ctx.areaY + ctx.areaH / 2;
  },

  target(_p, i, _elapsed, _ctx, out) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * pitchX;
    const y = gridY + row * pitchY;

    // Screen offset from the middle of the area -> rotated, zoomed UV
    const dx = x - midX;
    const dy = y - midY;
    const u = (dx * cosA - dy * sinA) * invTileZoom + 0.5;
    const v = (dx * sinA + dy * cosA) * invTileZoom + 0.5;
    const tx = Math.floor((u - Math.floor(u)) * TEX);
    const ty = Math.floor((v - Math.floor(v)) * TEX);
    const k = (ty * TEX + tx) * 3;

    out.x = x;
    out.y = y;
    // ~0.36 * spacing radius: round dots with a visible gap, not a solid tile
    out.sizeMult = sizeMult;
    setColor(
      out,
      Math.min(255, texture[k] * gain),
      Math.min(255, texture[k + 1] * gain),
      Math.min(255, texture[k + 2] * gain)
    );
  }
};
