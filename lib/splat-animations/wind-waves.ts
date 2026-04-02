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

    const amplitude = 6.0 * ampMult
    const frequency = 0.05 // spatial frequency
    const speed = 0.0015 // temporal speed — ~4s cycle

    // Primary ripple wave
    const waveY = Math.sin(p.ox * frequency + elapsed * speed + phase) * amplitude
    
    // Pronounced wind gust on X
    const windGust = Math.sin(p.ox * frequency * 0.5 + elapsed * speed * 0.8 + phase) * (amplitude * 0.8)
    
    // High-frequency interference layer for turbulence
    const interference = Math.sin(p.oy * 0.1 + elapsed * 0.005) * 1.5

    const waveX = windGust + interference

    return {
      dx: waveX,
      dy: waveY + (interference * 0.5),
    }
  },
}
