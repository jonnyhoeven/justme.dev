import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';

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
let lastRowCols = 1;
let spacing = 20;
let gridX = 0;
let gridY = 0;
let cosA = 1;
let sinA = 0;
let zoom = 1;
let tile = 300;
let angle = 0;
let gain = 1;

export const rotozoom: SplatScene = {
  name: 'Rotozoom',
  alpha: 0.8,
  glow: 0.4,

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
    rows = Math.max(
      1,
      Math.round(Math.sqrt((count * ctx.areaH) / Math.max(1, ctx.areaW)))
    );
    cols = Math.max(1, Math.ceil(count / rows));
    rows = Math.max(1, Math.ceil(count / cols));
    lastRowCols = count - (rows - 1) * cols;
    spacing = Math.min(ctx.areaW / cols, ctx.areaH / rows);
    gridX = ctx.areaX + (ctx.areaW - cols * spacing) / 2 + spacing / 2;
    gridY = ctx.areaY + (ctx.areaH - rows * spacing) / 2 + spacing / 2;

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
  },

  target(p, i, _elapsed, ctx, out) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Centre the short last row instead of leaving a gap at the bottom right
    const rowShift =
      row === rows - 1 ? ((cols - lastRowCols) * spacing) / 2 : 0;
    const x = gridX + col * spacing + rowShift;
    const y = gridY + row * spacing;

    // Screen offset from the middle of the area -> rotated, zoomed UV
    const dx = x - (ctx.areaX + ctx.areaW / 2);
    const dy = y - (ctx.areaY + ctx.areaH / 2);
    const u = (dx * cosA - dy * sinA) / (tile * zoom) + 0.5;
    const v = (dx * sinA + dy * cosA) / (tile * zoom) + 0.5;
    const tx = Math.floor((u - Math.floor(u)) * TEX);
    const ty = Math.floor((v - Math.floor(v)) * TEX);
    const k = (ty * TEX + tx) * 3;

    out.x = x;
    out.y = y;
    // ~0.36 * spacing radius: round dots with a visible gap, not a solid tile
    out.sizeMult = (spacing * 0.041) / ctx.scale;
    out.colorOverride = `${Math.min(255, texture[k] * gain) | 0}, ${Math.min(255, texture[k + 1] * gain) | 0}, ${Math.min(255, texture[k + 2] * gain) | 0}`;
  }
};
