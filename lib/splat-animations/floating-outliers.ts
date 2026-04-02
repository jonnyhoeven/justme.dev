import type { SplatAnimation, SplatParticle, AnimationEffect, AnimationContext } from './types'

/**
 * Floating Outliers
 *
 * ~4 % of the outermost edge particles are tagged as "outliers".
 * They use a much weaker spring so they drift lazily, and receive
 * rare, gentle random velocity nudges that make them wander around
 * the portrait like tiny orbiting satellites.
 *
 * Non-outlier particles behave normally (effect is a no-op).
 */
export const floatingOutliers: SplatAnimation = {
  name: 'Floating Outliers',

  init(particles: SplatParticle[], _width: number, _height: number) {
    const cx = 160
    const cy = 160

    // Find max radius
    let maxDist = 0
    for (const p of particles) {
      const d = Math.sqrt((p.ox - cx) ** 2 + (p.oy - cy) ** 2)
      if (d > maxDist) maxDist = d
    }

    const ringThreshold = maxDist * 0.7

    for (const p of particles) {
      const d = Math.sqrt((p.ox - cx) ** 2 + (p.oy - cy) ** 2)
      // Only particles in the outer ring, and only ~15% of those
      p.isOutlier = d > ringThreshold && Math.random() < 0.15
      
      // Each particle gets a unique animation phase for its drift/wobble
      p.outlierPhase = Math.random() * Math.PI * 2
      p.wanderFreq = 0.0003 + Math.random() * 0.0005
      p.wanderAmp = 6 + Math.random() * 8
      p.coreWobblePhase = Math.random() * Math.PI * 2
    }
  },

  apply(p: SplatParticle, elapsed: number, _ctx: AnimationContext, _particles: SplatParticle[]): AnimationEffect {
    // ---- Outlier behavior: Active Wandering Satellite ----
    if (p.isOutlier) {
      const phase = p.outlierPhase ?? 0
      const freq = p.wanderFreq ?? 0.0004
      const amp = p.wanderAmp ?? 10
      
      // Slow, organic wander (drift)
      const dx = Math.sin(elapsed * freq + phase) * amp
      const dy = Math.cos(elapsed * freq * 0.7 + phase) * amp
      
      // Very weak spring for a 'satellite' feel
      const springScale = 0.08
      
      // Rare velocity pulse (every ~20s)
      let nudgeVx = 0
      let nudgeVy = 0
      if (Math.random() < 0.0008) {
        nudgeVx = (Math.random() - 0.5) * 0.8
        nudgeVy = (Math.random() - 0.5) * 0.8
      }

      return { dx, dy, springScale, nudgeVx, nudgeVy }
    }

    // ---- Core behavior: Subtle Shiver/Wobble (feels living but stable) ----
    const wobblePhase = p.coreWobblePhase ?? 0
    // Shorter cycle (2s) but tiny amplitude (0.5px)
    const wobbleX = Math.sin(elapsed * 0.003 + wobblePhase) * 0.5
    const wobbleY = Math.cos(elapsed * 0.002 + wobblePhase) * 0.5

    return { 
      dx: wobbleX, 
      dy: wobbleY,
      springScale: 1.0
    }
  },
}
