// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';
import {
  frac,
  HUE_SPAN,
  HUE_START,
  HUE_SWAY,
  R2_A,
  R2_B,
  setHsl
} from './utils';

/**
 * Rotating dot shapes (vector-demo style): the particles sit on a sphere,
 * torus and cube surface in turn, morphing between them while spinning.
 * Each dot gets a hue from its place on the surface, kept within the site's
 * blue-indigo-violet brand range, and is shaded by depth so the far side recedes.
 */

const SHAPE_TIME = 4500;
const BLEND_FRACTION = 0.3;
// In shape radii. Far enough that the cube's near and far corners differ by
// ~1.5x in scale (at 3 it was 2.6x, which made the cube look warped).
const CAMERA_DISTANCE = 6;
let shapes: Float32Array[] = [];
let shapeA = 0;
let shapeB = 0;
let blend = 0;
let cosY = 1;
let sinY = 0;
let cosX = 1;
let sinX = 0;
let cx = 0;
let cy = 0;
let radius = 100;
let angleY = 0;
let hueShift = 0;
let lightBase = 0.6;

const smooth = (t: number) => t * t * (3 - 2 * t);

export const dotShapes: SplatScene = {
  name: 'Dot Shapes',

  init(particles: SplatParticle[]) {
    const n = particles.length;
    const sphere = new Float32Array(n * 3);
    const torus = new Float32Array(n * 3);
    const cube = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < n; i++) {
      const a = frac((i + 1) * R2_A) * 2 - 1;
      const b = frac((i + 1) * R2_B) * 2 - 1;

      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      sphere.set(
        [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r],
        i * 3
      );

      const u = (a + 1) * Math.PI;
      const v = (b + 1) * Math.PI;
      const ring = 0.7 + 0.3 * Math.cos(v);
      torus.set(
        [ring * Math.cos(u), 0.3 * Math.sin(v), ring * Math.sin(u)],
        i * 3
      );

      const face = i % 6;
      const axis = face >> 1;
      const sign = face & 1 ? -1 : 1;
      const c = [a, b];
      c.splice(axis, 0, sign);
      cube.set(
        c.map((v2) => v2 * 0.78),
        i * 3
      );
    }
    shapes = [sphere, torus, cube];
    angleY = 0;
  },

  beforeFrame(elapsed, ctx) {
    const cycle = elapsed / SHAPE_TIME;
    const idx = Math.floor(cycle);
    const f = frac(cycle);
    shapeA = idx % shapes.length;
    shapeB = (idx + 1) % shapes.length;
    blend = smooth(Math.max(0, (f - (1 - BLEND_FRACTION)) / BLEND_FRACTION));

    // Integrated spin: faster with the music, kicked forward on each beat
    const { volume, beat, bass } = ctx.audioLevels;
    angleY += ctx.dt * (0.0007 + volume * 0.002 + beat * 0.004);
    hueShift = Math.sin(elapsed * 0.0004) * HUE_SWAY;
    // Light enough to glow on a dark page, deep enough to read on a light one
    lightBase = isDarkTheme() ? 0.62 : 0.42;
    const ay = angleY;
    const ax = 0.5 + Math.sin(elapsed * 0.0003) * 0.4;
    cosY = Math.cos(ay);
    sinY = Math.sin(ay);
    cosX = Math.cos(ax);
    sinX = Math.sin(ax);

    cx = ctx.areaX + ctx.areaW / 2;
    cy = ctx.areaY + ctx.areaH / 2;
    radius =
      Math.min(ctx.areaW, ctx.areaH) * 0.42 * (1 + beat * 0.14 + bass * 0.08);
  },

  target(p, i, _elapsed, _ctx, out) {
    const k = i * 3;
    const a = shapes[shapeA];
    const b = shapes[shapeB];
    const x0 = a[k] + (b[k] - a[k]) * blend;
    const y0 = a[k + 1] + (b[k + 1] - a[k + 1]) * blend;
    const z0 = a[k + 2] + (b[k + 2] - a[k + 2]) * blend;

    // rotate around Y, then X
    const x1 = x0 * cosY + z0 * sinY;
    const z1 = -x0 * sinY + z0 * cosY;
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;

    const persp = CAMERA_DISTANCE / (CAMERA_DISTANCE + z2);
    out.x = cx + x1 * radius * persp;
    out.y = cy + y2 * radius * persp;
    out.sizeMult = 0.35 + persp * 0.4;

    // Hue follows the particle's fixed spot on the surface; depth shades it
    const hue = HUE_START + frac((i + 1) * R2_A) * HUE_SPAN + hueShift;
    const depthShade = Math.max(0, Math.min(1, (persp - 0.7) / 0.6));
    setHsl(out, hue, 0.85, lightBase * (0.55 + 0.45 * depthShade));
  }
};
