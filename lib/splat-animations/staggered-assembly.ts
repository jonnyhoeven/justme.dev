import type { SplatAnimation, SplatParticle, AnimationEffect } from './types'

/**
 * Staggered Radial Assembly
 *
 * On page load, particles are randomly scattered. Instead of snapping
 * into place all at once, a radial wave sweeps outward from the center:
 * inner particles assemble first, outer ones ripple in over ~2.5 seconds.
 *
 * After assembly completes the portrait sits quietly with just the
 * default mouse-repulsion physics — a cinematic one-time reveal.
 */
export const staggeredAssembly: SplatAnimation = {
  name: 'Staggered Assembly',

  init(particles: SplatParticle[]) {
    const cx = 160
    const cy = 160
    for (const p of particles) {
      const dist = Math.sqrt((p.ox - cx) ** 2 + (p.oy - cy) ** 2)
      // Centre starts at 200ms, outermost (~130px radius) at ~2.2s
      p.assemblyDelay = 200 + dist * 15
    }
  },

  apply(p: SplatParticle, elapsed: number): AnimationEffect {
    const delay = p.assemblyDelay ?? 0

    if (elapsed < delay) {
      // Before reveal: keep spring off
      return { dx: 0, dy: 0, springScale: 0.001 }
    }

    // --- Activation Burst: Decaying shudder/explosion effect ---
    const t = (elapsed - delay)
    const rampDuration = 600
    const factor = Math.min(1, t / rampDuration)
    
    // Decaying amplitude (starts at 15px, drops to 0 over ~600ms)
    const shudderAmp = Math.max(0, (1 - factor) * 15)
    // High-frequency "nervous" rattle
    const rattle = Math.sin(t * 0.04) * shudderAmp
    
    // Overshoot: use a cubic ease that hits 1.15 and then drops back to 1.0
    // Simple way: t - sin(t) for a bounce, but let's just use a decaying sine for the offset
    const bounceX = Math.cos(t * 0.015) * shudderAmp * 0.5
    const bounceY = Math.sin(t * 0.015) * shudderAmp * 0.5

    // Fast spring ramp for that 'snap' feel
    const easedSpring = Math.min(1, factor * 2)

    return { 
      dx: rattle + bounceX, 
      dy: rattle + bounceY, 
      springScale: easedSpring 
    }
  },
}
