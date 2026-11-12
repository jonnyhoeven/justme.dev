// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  seekKeyStep,
  isChannelSoloed,
  SEEK_MAX_PERCENT
} from '../../lib/player-a11y';

describe('seekKeyStep', () => {
  it('steps by 5 with arrow keys', () => {
    expect(seekKeyStep('ArrowRight', 20)).toBe(25);
    expect(seekKeyStep('ArrowUp', 20)).toBe(25);
    expect(seekKeyStep('ArrowLeft', 20)).toBe(15);
    expect(seekKeyStep('ArrowDown', 20)).toBe(15);
  });

  it('steps by 10 with Page keys', () => {
    expect(seekKeyStep('PageUp', 20)).toBe(30);
    expect(seekKeyStep('PageDown', 20)).toBe(10);
  });

  it('jumps with Home and End, never reaching the very end', () => {
    expect(seekKeyStep('Home', 50)).toBe(0);
    expect(seekKeyStep('End', 50)).toBe(SEEK_MAX_PERCENT);
    expect(SEEK_MAX_PERCENT).toBeLessThan(100);
  });

  it('clamps at both ends', () => {
    expect(seekKeyStep('ArrowLeft', 2)).toBe(0);
    expect(seekKeyStep('PageDown', 3)).toBe(0);
    expect(seekKeyStep('ArrowRight', 98)).toBe(SEEK_MAX_PERCENT);
    expect(seekKeyStep('PageUp', 95)).toBe(SEEK_MAX_PERCENT);
  });

  it('returns null for other keys', () => {
    expect(seekKeyStep('a', 10)).toBeNull();
    expect(seekKeyStep('Enter', 10)).toBeNull();
    expect(seekKeyStep('Tab', 10)).toBeNull();
  });

  it('treats a non-finite position as 0', () => {
    expect(seekKeyStep('ArrowRight', NaN)).toBe(5);
  });
});

describe('isChannelSoloed', () => {
  it('is true only when every other channel is muted', () => {
    expect(isChannelSoloed([false, true, true], 0)).toBe(true);
    expect(isChannelSoloed([false, false, true], 0)).toBe(false);
    expect(isChannelSoloed([true, true, true], 0)).toBe(false);
    expect(isChannelSoloed([false, false, false], 1)).toBe(false);
  });

  it('is false for a single channel or empty state', () => {
    expect(isChannelSoloed([false], 0)).toBe(false);
    expect(isChannelSoloed([], 0)).toBe(false);
  });
});
