// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { formatCount } from '../../lib/formatCount';

describe('formatCount', () => {
  it('leaves small numbers alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(34)).toBe('34');
    expect(formatCount(999)).toBe('999');
  });

  it('abbreviates thousands with one decimal', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1234)).toBe('1.2k');
    expect(formatCount(12500)).toBe('12.5k');
    expect(formatCount(999_999)).toBe('999.9k');
  });

  it('abbreviates millions and billions', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(1_250_000)).toBe('1.2M');
    expect(formatCount(2_000_000_000)).toBe('2B');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatCount(undefined)).toBe('');
    expect(formatCount(null)).toBe('');
    expect(formatCount('12')).toBe('');
    expect(formatCount(NaN)).toBe('');
    expect(formatCount(-1)).toBe('');
  });
});
