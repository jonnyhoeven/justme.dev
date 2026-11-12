// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

/** Frame time (ms) the hero physics constants were tuned for (60 Hz). */
export const REFERENCE_FRAME_MS = 1000 / 60;

/** Number of reference (60 Hz) frames a step of `dt` ms is worth. */
export const frameScale = (dt: number) => dt / REFERENCE_FRAME_MS;

/** Per-frame damping factor `damp` expressed for a step of `dt` ms. */
export const dampFactor = (damp: number, dt: number) =>
  Math.pow(damp, frameScale(dt));

/** Frame-rate independent exponential ease rate (`rate` is per 60 Hz frame). */
export const easeRate = (rate: number, dt: number) =>
  1 - Math.pow(1 - rate, frameScale(dt));
