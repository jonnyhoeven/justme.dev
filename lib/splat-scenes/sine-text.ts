// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { SplatScene } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';
import { setHsl } from './utils';

/**
 * Sine-wave text, demo-scene style: "JUST / MAKE IT!" in a 5x7 bitmap font,
 * built from overlapping particles (a few per font pixel) so the strokes are
 * bold, with a travelling sine wave running through the letters. The whole
 * phrase is always on screen, so it reads at any moment, however early the
 * scene is skipped. A muted indigo gradient rolls along the phrase with the wave.
 */

export const LINES = ['JUST', 'MAKE IT!'];

const GLYPH_COLS = 5;
const GLYPH_ROWS = 7;
const ADVANCE = GLYPH_COLS + 1;
const WIDEST_COLS = Math.max(...LINES.map((l) => l.length * ADVANCE - 1));
const LINE_GAP_ROWS = 2.5;
const WAVE_FREQ = 0.012;
const WAVE_SPEED = 0.003;
const WAVE_RAMP_MS = 1500;
// Fraction of the area the text may use, and where its centre sits. The text
// leans right, away from the hero headline.
const FIT_WIDTH = 0.6;
const FIT_HEIGHT = 0.72;
const CENTER_X = 0.68;

// 5x7 bitmap font (only the glyphs the text needs), rows separated by "/"
export const FONT: Record<string, string> = {
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  E: '#####/#..../#..../####./#..../#..../#####',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  '!': '..#../..#../..#../..#../..#../...../..#..'
};

interface Pixel {
  /** Column relative to the middle of its line, in font pixels */
  gx: number;
  /** Row from the top of the whole block, in font pixels */
  gy: number;
}

const pixels: Pixel[] = [];
let blockRows = 0;
let cell = 14;
let cx = 0;
let cy = 0;
let amp = 0;
let phase = 0;
let energy = 0;
let ramp = 0;
let lightness = 0.6;

const buildPixels = () => {
  if (pixels.length) return;
  LINES.forEach((line, lineIndex) => {
    const lineCols = line.length * ADVANCE - 1;
    const top = lineIndex * (GLYPH_ROWS + LINE_GAP_ROWS);
    for (let c = 0; c < line.length; c++) {
      const glyph = FONT[line[c]];
      if (!glyph) continue;
      const rows = glyph.split('/');
      for (let x = 0; x < GLYPH_COLS; x++) {
        for (let y = 0; y < GLYPH_ROWS; y++) {
          if (rows[y][x] !== '#') continue;
          pixels.push({
            gx: c * ADVANCE + x - lineCols / 2 + 0.5,
            gy: top + y
          });
        }
      }
    }
  });
  blockRows = LINES.length * GLYPH_ROWS + (LINES.length - 1) * LINE_GAP_ROWS;
};

/** Cheap deterministic 0..1 value per particle (stable jitter, no state) */
const hash = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export const sineText: SplatScene = {
  name: 'Sine Text',
  // Faint: just enough to seat the phrase in the page without tinting the letters
  glow: 0.3,

  glowRect(_ctx, out) {
    out.x = cx;
    out.y = cy;
    out.w = WIDEST_COLS * cell * 1.5;
    out.h = blockRows * cell * 1.6;
  },

  init() {
    phase = 0;
    buildPixels();
  },

  beforeFrame(elapsed, ctx) {
    const { volume, bass, beat } = ctx.audioLevels;
    phase += ctx.dt * WAVE_SPEED * (1 + volume * 2.5);
    energy = 1 + bass * 1.3 + beat * 0.7;
    cell = Math.min(
      (ctx.areaW * FIT_WIDTH) / WIDEST_COLS,
      (ctx.areaH * FIT_HEIGHT) / blockRows
    );
    cx = ctx.areaX + ctx.areaW * CENTER_X;
    cy = ctx.areaY + ctx.areaH / 2;
    // The wave grows in, so the text first assembles flat and readable
    ramp = Math.min(1, elapsed / WAVE_RAMP_MS);
    amp = cell * 0.7 * ramp * energy;
    lightness = isDarkTheme() ? 0.68 : 0.52;
  },

  target(_p, i, _elapsed, ctx, out) {
    // Several particles share each font pixel; the jitter makes strokes bold
    const px = pixels[i % pixels.length];
    const x = cx + px.gx * cell + (hash(i, 1) - 0.5) * cell * 0.7;
    const y =
      cy +
      (px.gy - blockRows / 2 + 0.5) * cell +
      (hash(i, 2) - 0.5) * cell * 0.7 +
      Math.sin(x * WAVE_FREQ + phase) * amp;

    out.x = x;
    out.y = y;
    // ~0.75 * cell radius: neighbouring dots overlap into solid strokes
    out.sizeMult = (cell * 0.085) / ctx.scale;
    // Muted brand indigo (0.67): a narrow hue sway along the wave, crests a
    // touch lighter than troughs, and a little per-dot variation so the
    // overlapping strokes get depth instead of flat saturated fills
    const wave = Math.sin(x * WAVE_FREQ + phase);
    setHsl(
      out,
      0.665 + wave * 0.035,
      0.5,
      lightness + wave * 0.05 + (hash(i, 3) - 0.5) * 0.06
    );
  }
};
