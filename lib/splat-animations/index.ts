// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Splat Animation System — barrel export + random picker.
 *
 * HeroSplat runs an animation director that rotates through avatar
 * animations and full-canvas scenes on the canvas particles.
 */

import { orbitalDrift } from './orbital-drift';
import { windWaves } from './wind-waves';
import { floatingOutliers } from './floating-outliers';
import { flubberMotion } from './flubber-motion';
import { ferrofluid } from './ferrofluid';
import { quantumEntanglement } from './quantum-entanglement';
import { dimensionalPortal } from './dimensional-portal';
import { spectrumHalo } from './spectrum-halo';
import type { SplatAnimation } from './types';

export type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

export const animations: SplatAnimation[] = [
  orbitalDrift,
  floatingOutliers,
  flubberMotion,
  windWaves,
  ferrofluid,
  quantumEntanglement,
  dimensionalPortal,
  spectrumHalo
];

/**
 * Pick a uniformly random animation from the registry.
 * Returns the animation and its index so clicking can cycle from there.
 */
export function pickRandomAnimation(): {
  animation: SplatAnimation;
  index: number;
} {
  const idx = Math.floor(Math.random() * animations.length);
  return { animation: animations[idx], index: idx };
}
