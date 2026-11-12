// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import {
  REFERENCE_FRAME_MS,
  dampFactor,
  easeRate,
  frameScale
} from '../../lib/splat-animations/timestep';

describe('timestep', () => {
  it('is the identity at 60 Hz', () => {
    expect(frameScale(REFERENCE_FRAME_MS)).toBeCloseTo(1, 10);
    expect(dampFactor(0.8, REFERENCE_FRAME_MS)).toBeCloseTo(0.8, 10);
    expect(easeRate(0.08, REFERENCE_FRAME_MS)).toBeCloseTo(0.08, 10);
  });

  it('two half-steps of damping equal one full step', () => {
    const half = dampFactor(0.8, REFERENCE_FRAME_MS / 2);
    expect(half * half).toBeCloseTo(0.8, 10);
  });

  it('two half-steps of glow easing equal one full step', () => {
    const half = easeRate(0.08, REFERENCE_FRAME_MS / 2);
    let level = 0;
    for (let i = 0; i < 2; i++) level += (1 - level) * half;
    expect(level).toBeCloseTo(0.08, 10);
  });

  it('simulates the same spring-damper motion at 60 and 120 Hz', () => {
    const run = (dt: number, seconds: number) => {
      const k = frameScale(dt);
      const d = dampFactor(0.8, dt);
      let x = 100;
      let v = 0;
      for (let t = 0; t < seconds * 1000; t += dt) {
        v = (v + -0.05 * x * k) * d;
        x += v * k;
      }
      return x;
    };
    // Same dynamics up to integrator error (a few % of the 100px amplitude, mostly in the first frames)
    for (const seconds of [0.1, 0.2, 0.5]) {
      const diff = Math.abs(
        run(REFERENCE_FRAME_MS / 2, seconds) - run(REFERENCE_FRAME_MS, seconds)
      );
      expect(diff).toBeLessThan(8);
    }
  });
});
