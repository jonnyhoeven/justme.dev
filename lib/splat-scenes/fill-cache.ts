// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Cached `fillStyle` strings for tinted splats. Channels are quantised to
 * 6 bits (steps of 4, at most 2 off the exact value), so the whole palette is
 * a few thousand strings at most and no string is built per particle once the
 * scene colours have been seen.
 */
const SHIFT = 2;
const fills = new Map<number, string>();

// NaN and negatives fall to bucket 0, anything above 255 to bucket 63
const channel = (v: number) => (v > 0 ? (v > 255 ? 255 : v | 0) >> SHIFT : 0);

/** The quantised value of one 0-255 channel (the centre of its bucket). */
export const quantiseChannel = (v: number) =>
  (channel(v) << SHIFT) + (1 << (SHIFT - 1));

/** `rgb(r, g, b)` for the quantised colour; the same string instance every time. */
export const fillStyleFor = (r: number, g: number, b: number): string => {
  const key = (channel(r) << 12) | (channel(g) << 6) | channel(b);
  let s = fills.get(key);
  if (s === undefined) {
    s = `rgb(${quantiseChannel(r)}, ${quantiseChannel(g)}, ${quantiseChannel(b)})`;
    fills.set(key, s);
  }
  return s;
};

/** Number of cached styles (for tests). */
export const fillCacheSize = () => fills.size;
