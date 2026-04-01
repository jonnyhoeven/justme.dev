import type { SplatAnimation, SplatParticle, AnimationEffect } from './types'

/**
 * Ambient Wind Waves
 *
 * A slow sine wave travels horizontally across the particles,
 * making the portrait gently ripple like a reflection on water.
 * Gentle ripple — period ~8s, amplitude ±3.5px.
 */
export const windWaves: SplatAnimation = {
  name: 'Wind Waves',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individualize the wave phase and amplitude
      p.wavePhaseOffset = Math.random() * Math.PI * 2
      // 80% to 120% variation in how much they're affected by the wind
      p.breathAmpMult = 0.8 + Math.random() * 0.4 
    }
  },

  apply(p: SplatParticle, elapsed: number): AnimationEffect {
    const phase = p.wavePhaseOffset ?? 0
    const ampMult = p.breathAmpMult ?? 1 // Reuse breathAmpMult or just use a local random

    const amplitude = 3.5 * ampMult
    const frequency = 0.04 // spatial frequency across 320-unit width
    const speed = 0.0008 // temporal speed — ~8s full cycle

    // Add phase to the wave for organic turbulence
    const waveY = Math.sin(p.ox * frequency + elapsed * speed + phase) * amplitude
    // Gentler secondary wave on X 
    const waveX = Math.sin(p.oy * frequency * 0.7 + elapsed * speed * 0.6 + phase) * amplitude * 0.4

    return {
      dx: waveX,
      dy: waveY,
    }
  },
}
