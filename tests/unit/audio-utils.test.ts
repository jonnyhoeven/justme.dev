import { describe, it, expect } from 'vitest';
import {
  smoothValue,
  getPeak,
  getAudioLevels,
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

describe('getPeak', () => {
  it('returns 0 when value is below threshold', () => {
    expect(getPeak(0.3, 0.5)).toBe(0);
  });

  it('returns 0 when value exactly equals threshold', () => {
    expect(getPeak(0.5, 0.5)).toBe(0);
  });

  it('returns 1.0 when value is 1.0 and threshold is 0.0', () => {
    expect(getPeak(1.0, 0.0)).toBeCloseTo(1.0, 5);
  });

  it('returns correct normalized value above threshold', () => {
    // (0.75 - 0.5) / (1 - 0.5) = 0.5
    expect(getPeak(0.75, 0.5)).toBeCloseTo(0.5, 5);
  });

  it('returns 1.0 when value is at maximum (1.0) and threshold is 0.5', () => {
    expect(getPeak(1.0, 0.5)).toBeCloseTo(1.0, 5);
  });
});

describe('getAudioLevels', () => {
  it('returns all zeros for undefined input', () => {
    const result = getAudioLevels(undefined);
    expect(result).toEqual({ bass: 0, mid: 0, treble: 0, volume: 0 });
  });

  it('returns all zeros for empty Uint8Array', () => {
    const result = getAudioLevels(new Uint8Array(0));
    expect(result).toEqual({ bass: 0, mid: 0, treble: 0, volume: 0 });
  });

  it('returns all 1.0 for a full-amplitude signal (all 255)', () => {
    const data = new Uint8Array(30).fill(255);
    const result = getAudioLevels(data);
    expect(result.bass).toBeCloseTo(1.0, 5);
    expect(result.mid).toBeCloseTo(1.0, 5);
    expect(result.treble).toBeCloseTo(1.0, 5);
    expect(result.volume).toBeCloseTo(1.0, 5);
  });

  it('returns all zeros for a silent signal (all 0)', () => {
    const data = new Uint8Array(30).fill(0);
    const result = getAudioLevels(data);
    expect(result).toEqual({ bass: 0, mid: 0, treble: 0, volume: 0 });
  });

  it('distinguishes bass from mid/treble when only low bins are active', () => {
    // 30 samples: bins 0-9 = bass, 10-19 = mid, 20-29 = treble
    const data = new Uint8Array(30).fill(0);
    // Fill only bass bins to maximum
    for (let i = 0; i < 10; i++) data[i] = 255;
    const result = getAudioLevels(data);
    expect(result.bass).toBeCloseTo(1.0, 5);
    expect(result.mid).toBe(0);
    expect(result.treble).toBe(0);
  });

  it('caps values at 1.0 even for over-saturated data', () => {
    const data = new Uint8Array(3).fill(255);
    const result = getAudioLevels(data);
    expect(result.bass).toBeLessThanOrEqual(1.0);
    expect(result.mid).toBeLessThanOrEqual(1.0);
    expect(result.treble).toBeLessThanOrEqual(1.0);
    expect(result.volume).toBeLessThanOrEqual(1.0);
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
