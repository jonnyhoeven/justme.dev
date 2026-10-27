// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  smoothValue,
  AudioTracker
} from '../../lib/splat-animations/audio-utils';

describe('smoothValue', () => {
  it('returns the target when factor is 1.0', () => {
    expect(smoothValue(0, 100, 1.0)).toBe(100);
  });

  it('returns the current when factor is 0.0', () => {
    expect(smoothValue(50, 100, 0.0)).toBe(50);
  });

  it('blends current and target using default factor 0.02', () => {
    const result = smoothValue(0, 100);
    // current*(1-0.02) + target*0.02 = 0*0.98 + 100*0.02 = 2
    expect(result).toBeCloseTo(2, 5);
  });

  it('moves toward the target each step', () => {
    let val = 0;
    for (let i = 0; i < 100; i++) {
      val = smoothValue(val, 1, 0.1);
    }
    // After 100 steps with factor=0.1 it should be very close to 1
    expect(val).toBeGreaterThan(0.99);
  });

  it('handles current equal to target (no movement)', () => {
    expect(smoothValue(42, 42, 0.5)).toBe(42);
  });

  it('works with negative values', () => {
    const result = smoothValue(-100, 0, 0.5);
    expect(result).toBeCloseTo(-50, 5);
  });
});

describe('AudioTracker', () => {
  const frame = (bass: number, mid = 0, treble = 0) => {
    const data = new Uint8Array(512);
    data.fill(Math.round(treble * 255), 52, 205);
    data.fill(Math.round(mid * 255), 6, 52);
    data.fill(Math.round(bass * 255), 0, 6);
    return data;
  };

  it('stays at zero for silence and for missing data', () => {
    const t = new AudioTracker();
    expect(t.update(undefined, 16)).toMatchObject({
      bass: 0,
      beat: 0,
      beats: 0
    });
    expect(t.update(new Uint8Array(512), 16)).toMatchObject({
      volume: 0,
      beats: 0
    });
  });

  it('detects a kick after quiet bass and decays the beat envelope', () => {
    const t = new AudioTracker();
    for (let i = 0; i < 30; i++) t.update(frame(0.1), 16);
    const hit = { ...t.update(frame(0.9), 16) };
    expect(hit.beats).toBe(1);
    expect(hit.beat).toBeGreaterThan(0.5);
    for (let i = 0; i < 80; i++) t.update(frame(0.9), 16);
    expect(t.update(frame(0.9), 16).beat).toBeLessThan(0.02);
  });

  it('ignores sustained bass and respects the cooldown', () => {
    const t = new AudioTracker();
    for (let i = 0; i < 200; i++) t.update(frame(0.8), 16);
    const sustained = t.update(frame(0.8), 16).beats;
    expect(sustained).toBeLessThanOrEqual(1);
    const t2 = new AudioTracker();
    for (let i = 0; i < 30; i++) t2.update(frame(0.05), 16);
    t2.update(frame(0.9), 16);
    t2.update(frame(0.05), 16);
    t2.update(frame(0.9), 16); // 32ms later: inside the cooldown
    expect(t2.update(frame(0.9), 16).beats).toBe(1);
  });

  it('fires on every hit of a rolling bassline that never goes quiet', () => {
    const t = new AudioTracker();
    // 16 frames (~256ms) per cycle: bass swings 0.85 <-> 0.45 for 2 seconds
    for (let i = 0; i < 120; i++) {
      t.update(frame(i % 16 < 6 ? 0.85 : 0.45), 16);
    }
    expect(t.update(frame(0.45), 16).beats).toBeGreaterThanOrEqual(6);
  });

  it('separates the bands', () => {
    const t = new AudioTracker();
    let l = t.update(frame(0, 0, 0.8), 16);
    for (let i = 0; i < 20; i++) l = t.update(frame(0, 0, 0.8), 16);
    expect(l.treble).toBeGreaterThan(0.8);
    expect(l.bass).toBe(0);
  });
});
