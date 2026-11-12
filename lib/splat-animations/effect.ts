// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { AnimationEffect } from './types';

/** A fresh effect holding the defaults. Create one and reuse it every frame. */
export const createEffect = (): AnimationEffect => ({
  dx: 0,
  dy: 0,
  springScale: 1,
  nudgeVx: 0,
  nudgeVy: 0,
  sizeMult: 1,
  tint: false,
  r: 0,
  g: 0,
  b: 0
});

/** Restores the defaults before each `SplatAnimation.apply` call. */
export const resetEffect = (out: AnimationEffect): void => {
  out.dx = 0;
  out.dy = 0;
  out.springScale = 1;
  out.nudgeVx = 0;
  out.nudgeVy = 0;
  out.sizeMult = 1;
  out.tint = false;
};
