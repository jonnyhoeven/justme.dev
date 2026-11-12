// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

/** Highest percent a keyboard seek may reach, so End never ends the track. */
export const SEEK_MAX_PERCENT = 99;

const SEEK_SMALL = 5;
const SEEK_LARGE = 10;

const clampPercent = (value: number): number =>
  Math.min(SEEK_MAX_PERCENT, Math.max(0, value));

/**
 * Maps a key press on a seek slider to the new position in percent (0-100),
 * or null when the key is not a seek key (so the caller leaves it alone).
 */
export const seekKeyStep = (key: string, current: number): number | null => {
  const base = Number.isFinite(current) ? current : 0;
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampPercent(base - SEEK_SMALL);
    case 'ArrowRight':
    case 'ArrowUp':
      return clampPercent(base + SEEK_SMALL);
    case 'PageDown':
      return clampPercent(base - SEEK_LARGE);
    case 'PageUp':
      return clampPercent(base + SEEK_LARGE);
    case 'Home':
      return 0;
    case 'End':
      return SEEK_MAX_PERCENT;
    default:
      return null;
  }
};

/** True when channel `index` is the only audible one (the solo toggle's state). */
export const isChannelSoloed = (mutes: boolean[], index: number): boolean =>
  mutes.length > 1 &&
  !mutes[index] &&
  mutes.every((muted, i) => i === index || muted);
