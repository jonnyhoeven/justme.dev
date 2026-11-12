// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Format a non-negative count compactly: 999 -> "999", 1234 -> "1.2k",
 * 12500 -> "12.5k", 1_200_000 -> "1.2M". Returns '' for missing or invalid
 * values so callers can hide the badge.
 */
export function formatCount(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '';
  }
  const n = Math.floor(value);
  if (n < 1000) return String(n);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k']
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      // Truncate (not round) to one decimal so 999_999 never shows as "1000k".
      const scaled = Math.floor((n / size) * 10) / 10;
      if (scaled >= 1000 && size < 1e9) continue;
      return `${scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return String(n);
}
