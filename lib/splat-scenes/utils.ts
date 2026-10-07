// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { AnimationContext } from '../splat-animations/types';

// Low-discrepancy (R2) sequence constants for even, deterministic scatter
export const R2_A = 0.7548776662466927;
export const R2_B = 0.5698402909980532;

export const frac = (v: number) => v - Math.floor(v);

/**
 * `sizeMult` for a dot of the given on-screen radius in px. HeroSplat draws
 * colour-override dots with radius `8 * scale * sizeMult * 1.1`.
 */
export const dotSize = (radiusPx: number, ctx: AnimationContext) =>
  radiusPx / (8.8 * ctx.scale);
