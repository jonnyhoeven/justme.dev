import type { SplatAnimation, SplatParticle, AnimationEffect, AnimationContext } from './types'

/**
 * Breathing / Pulse
 *
 * The entire splat cluster gently expands and contracts radially,
 * like it's breathing. Very slow (~10s cycle), very subtle (±2px).
 */
export const breathing: SplatAnimation = {
  name: 'Breathing',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individualize the pulse
      p.breathPhaseOffset = Math.random() * Math.PI * 2
      p.breathSpeedMult = 0.8 + Math.random() * 0.4 // 80% to 120% speed
      p.breathAmpMult = 0.7 + Math.random() * 0.6 // 70% to 130% amplitude
    }
  },

  apply(p: SplatParticle, elapsed: number): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0
    const speed = p.breathSpeedMult ?? 1
    const amp = p.breathAmpMult ?? 1

    // Base pulse (~8s) + individual variations
    const breathCycle = Math.sin(elapsed * 0.0008 * speed + phase) * (4 * amp)

    const cx = 160
    const cy = 160
    const angle = Math.atan2(p.oy - cy, p.ox - cx)

    return {
      dx: Math.cos(angle) * breathCycle,
      dy: Math.sin(angle) * breathCycle,
    }
  },
}
