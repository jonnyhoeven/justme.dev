/**
 * Splat Animation System — barrel export + random picker.
 *
 * On each page load one animation is chosen at random and
 * applied to the HeroSplat canvas particles.
 */

import { breathing } from './breathing'
import { orbitalDrift } from './orbital-drift'
import { windWaves } from './wind-waves'
import { floatingOutliers } from './floating-outliers'
import { flubberMotion } from './flubber-motion'
import { ferrofluid } from './ferrofluid'
import type { SplatAnimation } from './types'

export type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext,
} from './types'

export const animations: SplatAnimation[] = [
  breathing,
  orbitalDrift,
  windWaves,
  floatingOutliers,
  flubberMotion,
  ferrofluid,
]

/** Total number of available animations */
export const animationCount = animations.length

/** Get an animation by index (wraps around) */
export function getAnimation(index: number): SplatAnimation {
  return animations[((index % animations.length) + animations.length) % animations.length]
}

/**
 * Pick a uniformly random animation from the registry.
 * Returns the animation and its index so clicking can cycle from there.
 */
export function pickRandomAnimation(): { animation: SplatAnimation; index: number } {
  const idx = Math.floor(Math.random() * animations.length)
  const anim = animations[idx]
  console.log(`🎨 Splat animation: ${anim.name}`)
  return { animation: anim, index: idx }
}
