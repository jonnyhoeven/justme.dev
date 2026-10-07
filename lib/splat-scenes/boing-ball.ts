// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { SplatScene, SplatParticle } from '../splat-animations/types';
import { isDarkTheme } from '../splat-animations/color-utils';
import { dotSize, setColor } from './utils';

/**
 * The Amiga "Boing" ball: a red/white checkered sphere bounces and spins,
 * squashing on impact, with a shadow that shrinks as it rises. The floor is
 * the DOM glow behind the canvas, stretched flat under the ball, so nearly all
 * the particles go to the ball. Kicks make it hop higher.
 */

const SHADOW_FRACTION = 0.07;
const LON_SEGMENTS = 8;
const LAT_SEGMENTS = 4;
const TILT = 0.38;
const COS_TILT = Math.cos(TILT);
const SIN_TILT = Math.sin(TILT);
const BOUNCE_PERIOD = 1150;
// Black at partial opacity darkens the glow floor without shifting its hue
const SHADOW_COLOR = [0, 0, 0] as const;
const SHADOW_ALPHA = 0.1;
// The ball plays in this fraction of the area width, tucked against the right
// edge so it never bounces behind the hero text
const PLAY_WIDTH = 0.8;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const GROUND = 0.82; // where the ball lands, fraction of area height

let nShadow = 0;
let nBall = 0;
let unit = new Float32Array(0);
let tone = new Uint8Array(0);
let colors: (readonly number[])[] = [];

let bouncePhase = 0;
let xPhase = 0;
let spin = 0;

// Per-frame geometry
let cx = 0;
let radius = 60;
let ballX = 0;
let ballY = 0;
let squashX = 1;
let squashY = 1;
let rise = 0;
let cosS = 1;
let sinS = 0;
let ballDot = 1;
let shadowDot = 1;
let groundY = 0;
let ballR = 3;
let shadowR = 3;
let shadowScale = 1;

export const boingBall: SplatScene = {
  name: 'Boing Ball',
  alpha: 0.9,
  glow: 0.6,

  glowRect(ctx, out) {
    // A flat ellipse around the landing spot, so the glow reads as the floor
    out.x = ctx.areaX + ctx.areaW * (1 - PLAY_WIDTH / 2);
    out.y = ctx.areaY + ctx.areaH * GROUND;
    out.w = ctx.areaW * PLAY_WIDTH * 0.95;
    out.h = ctx.areaH * 0.4;
  },

  init(particles: SplatParticle[]) {
    const n = particles.length;
    nShadow = Math.round(n * SHADOW_FRACTION);
    nBall = n - nShadow;

    unit = new Float32Array(nBall * 3);
    tone = new Uint8Array(nBall);
    for (let k = 0; k < nBall; k++) {
      const y = 1 - (2 * (k + 0.5)) / nBall;
      const r = Math.sqrt(1 - y * y);
      const lon = k * GOLDEN;
      const x = Math.cos(lon) * r;
      const z = Math.sin(lon) * r;
      unit.set([x, y, z], k * 3);
      const lonSeg = Math.floor(
        ((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * LON_SEGMENTS
      );
      const latSeg = Math.floor(
        ((Math.asin(y) + Math.PI / 2) / Math.PI) * LAT_SEGMENTS
      );
      tone[k] = (lonSeg + latSeg) & 1;
    }

    const dark = isDarkTheme();
    // red, checker, then the dimmed back-face versions of both. On the light
    // theme the checker is deep slate (white vanishes) and the back faces fade
    // towards the page instead of towards black.
    colors = dark
      ? [
          [214, 52, 60],
          [222, 222, 226],
          [104, 30, 38],
          [96, 96, 108]
        ]
      : [
          [204, 44, 52],
          [48, 54, 88],
          [230, 156, 160],
          [168, 174, 198]
        ];
    bouncePhase = 0.15;
    xPhase = 0;
    spin = 0;
  },

  beforeFrame(_elapsed, ctx) {
    const { beat, bass } = ctx.audioLevels;
    bouncePhase += ctx.dt / BOUNCE_PERIOD;
    xPhase += ctx.dt * 0.00045;
    const dir = Math.cos(xPhase);
    spin +=
      ctx.dt * 0.0028 * Math.sign(dir || 1) * (0.35 + 0.65 * Math.abs(dir));
    cosS = Math.cos(spin);
    sinS = Math.sin(spin);

    const w = ctx.areaW * PLAY_WIDTH;
    const h = ctx.areaH;
    cx = ctx.areaX + ctx.areaW - w / 2;
    radius = Math.min(w * 0.16, h * 0.2);
    groundY = ctx.areaY + h * GROUND;

    // Parabolic hop touching the floor at integer phases
    const f = bouncePhase - Math.floor(bouncePhase);
    const hop = 1 - (2 * f - 1) * (2 * f - 1);
    const hopMax = h * 0.3 * (0.85 + beat * 0.2 + bass * 0.1);
    rise = hop * hopMax;

    // Flatten on impact, stretch a little in the air
    const impact = Math.max(0, 1 - hop * 7);
    squashY = 1 - 0.24 * impact + 0.05 * Math.min(1, hop * 2);
    squashX = 1 + 0.14 * impact;

    ballX = cx + Math.sin(xPhase) * (w / 2 - radius * 1.5);
    ballY = groundY - radius * squashY - rise;

    ballR = radius * Math.sqrt(2 / Math.max(1, nBall)) * 1.05;
    shadowR = radius * Math.sqrt(1 / Math.max(1, nShadow)) * 1.1;
    ballDot = dotSize(ballR, ctx);
    shadowDot = dotSize(shadowR * (1 - hop * 0.3), ctx);
    // Shadow shrinks and fades (via size) as the ball rises
    shadowScale = 1.05 - 0.45 * hop;
  },

  target(_p, i, _elapsed, _ctx, out) {
    // Draw order: shadow, ball
    if (i < nShadow) {
      const j = i;
      const r = Math.sqrt((j + 0.5) / nShadow);
      const a = j * GOLDEN;
      out.x = ballX + Math.cos(a) * r * radius * shadowScale;
      out.y =
        groundY - radius * 0.02 + Math.sin(a) * r * radius * shadowScale * 0.2;
      out.sizeMult = shadowDot;
      out.alpha = SHADOW_ALPHA;
      setColor(out, ...SHADOW_COLOR);
      return;
    }

    const k = i - nShadow;
    const ux = unit[k * 3];
    const uy = unit[k * 3 + 1];
    const uz = unit[k * 3 + 2];
    const x1 = ux * cosS + uz * sinS;
    const z1 = -ux * sinS + uz * cosS;
    const x2 = x1 * COS_TILT - uy * SIN_TILT;
    const y2 = x1 * SIN_TILT + uy * COS_TILT;

    out.x = ballX + x2 * radius * squashX;
    out.y = ballY + y2 * radius * squashY;
    const front = z1 > 0;
    out.sizeMult = ballDot * (front ? 0.85 + 0.2 * z1 : 0.55);
    const [r, g, b] = colors[tone[k] + (front ? 0 : 2)];
    setColor(out, r, g, b);
  }
};
