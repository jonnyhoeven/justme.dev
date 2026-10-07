// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { AnimationContext, SceneTarget } from '../splat-animations/types';

// Low-discrepancy (R2) sequence constants for even, deterministic scatter
export const R2_A = 0.7548776662466927;
export const R2_B = 0.5698402909980532;

export const frac = (v: number) => v - Math.floor(v);

// Brand hue band (in turns): blue (0.6) to violet (0.76), around the brand
// indigo (#6366f1 = 0.67). Scenes sway the whole band slightly over time.
export const HUE_START = 0.6;
export const HUE_SPAN = 0.16;
export const HUE_SWAY = 0.03;

/**
 * `sizeMult` for a dot of the given on-screen radius in px. HeroSplat draws
 * colour-override dots with radius `8 * scale * sizeMult * 1.1`.
 */
export const dotSize = (radiusPx: number, ctx: AnimationContext) =>
  radiusPx / (8.8 * ctx.scale);

/** Tint the splat with an RGB colour (0-255 channels). */
export const setColor = (out: SceneTarget, r: number, g: number, b: number) => {
  out.r = r;
  out.g = g;
  out.b = b;
  out.tint = true;
};

/** Tint the splat from HSL: h in turns (any value, wraps), s and l in 0..1. */
export const setHsl = (out: SceneTarget, h: number, s: number, l: number) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + (h - Math.floor(h)) * 12) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  setColor(out, f(0), f(8), f(4));
};
