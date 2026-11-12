// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  fillCacheSize,
  fillStyleFor,
  quantiseChannel
} from '../../lib/splat-scenes/fill-cache';

describe('fill cache', () => {
  it('quantises each channel to steps of 4, at most 2 off', () => {
    for (let v = 0; v <= 255; v++) {
      expect(Math.abs(quantiseChannel(v) - v)).toBeLessThanOrEqual(3);
    }
    expect(quantiseChannel(0)).toBe(2);
    expect(quantiseChannel(255)).toBe(254);
    expect(quantiseChannel(4)).toBe(quantiseChannel(7));
    expect(quantiseChannel(4)).not.toBe(quantiseChannel(8));
  });

  it('clamps out-of-range and non-finite channels', () => {
    expect(quantiseChannel(-20)).toBe(quantiseChannel(0));
    expect(quantiseChannel(999)).toBe(quantiseChannel(255));
    expect(quantiseChannel(NaN)).toBe(quantiseChannel(0));
  });

  it('builds a valid rgb() string', () => {
    expect(fillStyleFor(100, 150, 200)).toBe('rgb(102, 150, 202)');
  });

  it('returns the identical cached string for colours in the same bucket', () => {
    const a = fillStyleFor(10.2, 20.9, 30.1);
    const size = fillCacheSize();
    const b = fillStyleFor(11, 21, 31);
    expect(b).toBe(a);
    expect(fillCacheSize()).toBe(size);
  });

  it('adds one entry per new bucket only', () => {
    const size = fillCacheSize();
    fillStyleFor(200, 10, 10);
    fillStyleFor(201, 11, 11);
    expect(fillCacheSize()).toBe(size + 1);
  });
});
