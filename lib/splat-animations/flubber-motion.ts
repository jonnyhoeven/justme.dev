import type { SplatAnimation, SplatParticle, AnimationEffect, AnimationContext } from './types'

/**
 * Flubber Motion
 *
 * A tribute to the original Xbox "X-Blob" boot animation.
 * Instead of simple breathing, it uses multiple layers of asynchronous
 * noise to create "lumps" of motion that shift through the mass.
 *
 * It stays viscous and organic, feeling like a heavy fluid state.
 */
export const flubberMotion: SplatAnimation = {
  name: 'Flubber Motion',

  init(particles: SplatParticle[], _width: number, _height: number) {
    for (const p of particles) {
      // Individual phase offsets to break up uniformity
      p.breathPhaseOffset = Math.random() * Math.PI * 2
      // Each particle gets a "sensitivity" to the global noise
      p.breathAmpMult = 0.5 + Math.random() * 1.5
    }
  },

  apply(p: SplatParticle, elapsed: number, _ctx: AnimationContext, _particles: SplatParticle[]): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0
    const ampMult = p.breathAmpMult ?? 1
    
    // --- The "Lumpy" Logic ---
    // We use 3 layers of motion moving at different speeds (flubber-style)
    // Layer 1: Large slow pulse (The "Breath")
    const layer1 = Math.sin(elapsed * 0.0008 + phase) * 8 * ampMult
    
    // Layer 2: Medium lumpy swell (The "Churn")
    // This moves faster and is tied to the particle's original position to create spatial "lumps"
    const lumpyPhaseX = elapsed * 0.002 + (p.ox * 0.04)
    const lumpyPhaseY = elapsed * 0.002 + (p.oy * 0.04)
    const layer2X = Math.sin(lumpyPhaseX) * 4
    const layer2Y = Math.cos(lumpyPhaseY) * 4
    
    // Layer 3: Toxic shiver (The "Energy")
    // Very fast, tiny vibrations
    const layer3X = Math.sin(elapsed * 0.04 + phase) * 0.8
    const layer3Y = Math.cos(elapsed * 0.035 + phase) * 0.8

    // Combine for final displacement
    const dx = layer1 * 0.5 + layer2X + layer3X
    const dy = layer1 * 0.5 + layer2Y + layer3Y

    // Viscosity control: spring gets "tighter" when moving fast
    const velocityFactor = Math.abs(layer2X + layer2Y) / 8
    const springScale = 0.8 + velocityFactor * 0.4

    return { 
      dx, 
      dy, 
      springScale 
    }
  },
}
