// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { FONT, LINES } from '../../lib/splat-scenes/sine-text';
import { scenes } from '../../lib/splat-scenes';
import { DIGITS } from '../../lib/splat-scenes/pong';
import {
  dotSize,
  frac,
  setColor,
  setHsl,
  R2_A,
  R2_B,
  HUE_START,
  HUE_SPAN,
  HUE_SWAY
} from '../../lib/splat-scenes/utils';
import type {
  AnimationContext,
  SceneTarget,
  SplatParticle
} from '../../lib/splat-animations/types';

describe('sine text font', () => {
  it('has a glyph for every character except spaces', () => {
    const missing = [...new Set(LINES.join(''))].filter(
      (c) => c !== ' ' && !FONT[c]
    );
    expect(missing).toEqual([]);
  });

  it('defines every glyph as 7 rows of 5 columns', () => {
    for (const [char, glyph] of Object.entries(FONT)) {
      const rows = glyph.split('/');
      expect(rows, char).toHaveLength(7);
      for (const row of rows) expect(row, char).toHaveLength(5);
    }
  });
});

describe('pong digits', () => {
  it('defines digits 0-9 as 5 rows of 3 columns', () => {
    expect(DIGITS).toHaveLength(10);
    for (const d of DIGITS) {
      const rows = d.split('/');
      expect(rows).toHaveLength(5);
      for (const row of rows) expect(row).toHaveLength(3);
    }
  });
});

describe('scene registry', () => {
  it('has uniquely named scenes', () => {
    const names = scenes.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('animation registry', () => {
  it('has uniquely named animations', async () => {
    const { animations } = await import('../../lib/splat-animations');
    const names = animations.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('rotozoom scene', () => {
  it('arranges particles in a complete grid with no empty cells', async () => {
    const { rotozoom } = await import('../../lib/splat-scenes/rotozoom');
    const dummyParticles: SplatParticle[] = Array.from({ length: 560 }, () => ({
      ox: 0,
      oy: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '255, 255, 255',
      mass: 1,
      cr: 255,
      cg: 255,
      cb: 255,
      animState: {}
    }));
    const mockCtx: AnimationContext = {
      width: 1440,
      height: 400,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      mouseX: 0,
      mouseY: 0,
      areaX: 0,
      areaY: 0,
      areaW: 1440,
      areaH: 400,
      audioLevels: {
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
        beat: 0,
        beats: 0
      },
      dt: 16
    };
    rotozoom.init(dummyParticles, mockCtx);
    rotozoom.beforeFrame?.(0, mockCtx);

    const positions = new Set<string>();
    const out = { x: 0, y: 0, sizeMult: 1, alpha: 1 };
    for (let i = 0; i < dummyParticles.length; i++) {
      rotozoom.target(dummyParticles[i], i, 0, mockCtx, out);
      positions.add(`${Math.round(out.x)},${Math.round(out.y)}`);
    }

    // Every particle occupies a unique grid cell, meaning count = rows * cols
    expect(positions.size).toBe(560);
  });
});

describe('splat-scenes utils', () => {
  it('computes fractional parts correctly', () => {
    expect(frac(1.25)).toBeCloseTo(0.25);
    expect(frac(3.0)).toBeCloseTo(0);
    expect(R2_A).toBeGreaterThan(0);
    expect(R2_B).toBeGreaterThan(0);
    expect(HUE_START).toBe(0.6);
    expect(HUE_SPAN).toBe(0.16);
    expect(HUE_SWAY).toBe(0.03);
  });

  it('calculates dotSize relative to scale', () => {
    const mockCtx = { scale: 2 } as unknown as AnimationContext;
    expect(dotSize(17.6, mockCtx)).toBeCloseTo(1);
  });

  it('sets RGB color and tint flag', () => {
    const target = {} as SceneTarget;
    setColor(target, 100, 150, 200);
    expect(target).toEqual({ r: 100, g: 150, b: 200, tint: true });
  });

  it('sets HSL color correctly', () => {
    const target = {} as SceneTarget;
    setHsl(target, 0, 1, 0.5); // pure red
    expect(target.r).toBeCloseTo(255);
    expect(target.g).toBeCloseTo(0);
    expect(target.b).toBeCloseTo(0);
    expect(target.tint).toBe(true);

    // Test with wrap-around hue
    setHsl(target, 1.333, 1, 0.5); // green with hue > 1
    expect(target.tint).toBe(true);
  });
});
