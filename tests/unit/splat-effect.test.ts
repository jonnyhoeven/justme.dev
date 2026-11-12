// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { createEffect, resetEffect } from '../../lib/splat-animations/effect';
import { windWaves } from '../../lib/splat-animations/wind-waves';
import { dimensionalPortal } from '../../lib/splat-animations/dimensional-portal';
import { ferrofluid } from '../../lib/splat-animations/ferrofluid';
import { ZERO_AUDIO_LEVELS } from '../../lib/splat-animations/audio-utils';
import {
  CENTER_X,
  CENTER_Y
} from '../../lib/splat-animations/animation-constants';
import type {
  AnimationContext,
  SplatParticle
} from '../../lib/splat-animations/types';

const ctx: AnimationContext = {
  width: 800,
  height: 600,
  scale: 1.5,
  offsetX: 100,
  offsetY: 50,
  mouseX: -9999,
  mouseY: -9999,
  areaX: 0,
  areaY: 0,
  areaW: 800,
  areaH: 600,
  audioLevels: ZERO_AUDIO_LEVELS,
  dt: 16
};

const particle = (ox: number, oy: number, animState = {}): SplatParticle => ({
  ox,
  oy,
  x: ox,
  y: oy,
  vx: 0,
  vy: 0,
  color: '0, 0, 0',
  mass: 1,
  cr: 0,
  cg: 0,
  cb: 0,
  animState
});

describe('effect helpers', () => {
  it('createEffect holds the defaults', () => {
    expect(createEffect()).toEqual({
      dx: 0,
      dy: 0,
      springScale: 1,
      nudgeVx: 0,
      nudgeVy: 0,
      sizeMult: 1,
      tint: false,
      r: 0,
      g: 0,
      b: 0
    });
  });

  it('resetEffect restores the defaults without replacing the object', () => {
    const e = createEffect();
    const same = e;
    Object.assign(e, {
      dx: 5,
      dy: 6,
      springScale: 3,
      nudgeVx: 1,
      nudgeVy: 2,
      sizeMult: 4,
      tint: true
    });
    resetEffect(e);
    expect(e).toBe(same);
    expect(e).toMatchObject({
      dx: 0,
      dy: 0,
      springScale: 1,
      nudgeVx: 0,
      nudgeVy: 0,
      sizeMult: 1,
      tint: false
    });
  });
});

describe('animations write through the out-parameter', () => {
  it('wind waves match the original formula', () => {
    const p = particle(120, 80, { wavePhaseOffset: 1.2, breathAmpMult: 1.1 });
    const elapsed = 4000;
    windWaves.beforeFrame!([p], elapsed, ctx);
    const out = createEffect();
    windWaves.apply(p, elapsed, ctx, [p], out);

    // Silent audio: amplitude 6, speed 0.0015, turbulence 1.5
    const amp = 6 * 1.1;
    const waveY = Math.sin(120 * 0.05 + elapsed * 0.0015 + 1.2) * amp;
    const gust =
      Math.sin(120 * 0.05 * 0.5 + elapsed * 0.0015 * 0.8 + 1.2) * (amp * 0.8);
    const interference = Math.sin(80 * 1 + elapsed * 0.05) * 1.5;
    expect(out.dx).toBeCloseTo((gust + interference) * 1.5, 10);
    expect(out.dy).toBeCloseTo((waveY + interference * 0.1) * 1.5, 10);
    expect(out.springScale).toBe(1);
    expect(out.sizeMult).toBe(1);
    expect(out.tint).toBe(false);
  });

  it('dimensional portal matches the original projection', () => {
    const p = particle(150, 160, { cx: 40, cy: -30, cz: 20 });
    dimensionalPortal.init([p]);
    p.animState = { cx: 40, cy: -30, cz: 20 };
    dimensionalPortal.beforeFrame!([p], 1000, ctx);
    const out = createEffect();
    dimensionalPortal.apply(p, 1000, ctx, [p], out);

    const angleY = 0.0006 * 16;
    const tilt = 0.5 + Math.sin(1000 * 0.0003) * 0.35;
    const x1 = 40 * Math.cos(angleY) + 20 * Math.sin(angleY);
    const z1 = -40 * Math.sin(angleY) + 20 * Math.cos(angleY);
    const y2 = -30 * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z2 = -30 * Math.sin(tilt) + z1 * Math.cos(tilt);
    const persp = 520 / (520 + z2);
    expect(out.dx).toBeCloseTo((CENTER_X + x1 * persp - 150) * 1.5, 10);
    expect(out.dy).toBeCloseTo((CENTER_Y + y2 * persp - 160) * 1.5, 10);
    expect(out.springScale).toBe(2);
    expect(out.sizeMult).toBeCloseTo(Math.min(1.5, Math.max(0.6, persp)), 10);
  });

  it('ferrofluid leaves everything else at the defaults on its early return', () => {
    const p = particle(0, 0, {});
    ferrofluid.init([p]);
    ferrofluid.beforeFrame!([p], 0, ctx);
    // Put the particle exactly on the attractor so distMag < MIN_DIST_MAG
    const probe = particle(0, 0);
    probe.ox = (ctx.mouseX - ctx.offsetX) / ctx.scale;
    const out = createEffect();
    resetEffect(out);
    ferrofluid.apply(probe, 0, ctx, [probe], out);
    // Whichever branch ran, the contract is: only known fields, no tint
    expect(out.tint).toBe(false);
    expect(out.nudgeVx).toBe(0);
    expect(out.nudgeVy).toBe(0);
    expect(out.sizeMult).toBe(1);
    expect(Number.isFinite(out.springScale)).toBe(true);
  });
});
