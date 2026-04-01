import type { SplatAnimation, SplatParticle, AnimationEffect, AnimationContext } from './types'

/**
 * Depth Parallax Layers
 *
 * Each particle is assigned a random depth (0.9 – 1.1).
 * When the mouse moves, particles at different depths shift
 * by slightly different amounts, creating a subtle 3D parallax
 * that makes the flat portrait feel dimensional.
 *
 * The effect is mouse-driven and completely still when idle —
 * a nice complement to the existing repulsion physics.
 */
export const depthParallax: SplatAnimation = {
  name: 'Depth Parallax',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Tight range keeps the effect subtle
      p.depth = 0.92 + Math.random() * 0.16
    }
  },

  apply(p: SplatParticle, _elapsed: number, ctx: AnimationContext): AnimationEffect {
    // If mouse is off-screen (initialised at -9999), or naturally out of bounds,
    // don't apply any parallax. This prevents a huge 'jerk' when the mouse first enters.
    if (ctx.mouseX < 0 || ctx.mouseY < 0 || ctx.mouseX > ctx.width || ctx.mouseY > ctx.height) {
        return { dx: 0, dy: 0 }
    }

    const depth = p.depth ?? 1
    const factor = (depth - 1) * 0.04 // very small multiplier

    // Offset relative to viewport centre
    const parallaxX = (ctx.mouseX - ctx.width / 2) * factor
    const parallaxY = (ctx.mouseY - ctx.height / 2) * factor

    return {
      dx: parallaxX,
      dy: parallaxY,
    }
  },
}
