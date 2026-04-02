import type { SplatAnimation, SplatParticle, AnimationEffect, AnimationContext } from './types'

/**
 * Ferrofluid
 *
 * Simulates a magnetic fluid being pulled into sharp, jagged spikes.
 * Unlike "Flubber", this movement is snappy, sharp, and highly reactive
 * to the mouse (the primary magnet).
 *
 * Spikes form along radial "fingers" pointing toward the magnetic source.
 */
export const ferrofluid: SplatAnimation = {
  name: 'Ferrofluid',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Each particle has a unique harmonic phase and frequency
      p.breathPhaseOffset = Math.random() * Math.PI * 2
      // This will determine the "spike" resonance for each particle
      p.breathSpeedMult = 0.8 + Math.random() * 0.4
    }
  },

  apply(p: SplatParticle, elapsed: number, ctx: AnimationContext): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0
    
    // --- Magnet: Mouse (Primary) ---
    // Calculate distance and angle relative to the "magnetic cursor"
    const dxMouse = p.x - ctx.mouseX
    const dyMouse = p.y - ctx.mouseY
    const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)
    
    // Safety check for div by zero
    if (distMouse < 0.1) return { dx: 0, dy: 0, springScale: 1.5 }
    
    // The angle from the magnet determines which "spike" the particle stays in
    const angle = Math.atan2(dyMouse, dxMouse)
    
    // --- Rosensweig Spikes Logic ---
    // N = number of spikes around a source
    const spikeCount = 18
    // Use angle + time to create a slow rotation of the spikes
    const spikeWave = Math.sin(angle * spikeCount + elapsed * 0.0015)
    
    // Spike intensity decays as you move away from the magnet
    const intensity = Math.max(0, (250 - distMouse) / 250)
    
    // Higher power (4.0) makes the spikes much sharper/needle-like
    const spikeFactor = Math.pow(Math.abs(spikeWave), 4.0) * (spikeWave > 0 ? 1.5 : -0.2)
    
    // Stronger magnetic pull toward the source
    const attraction = -intensity * 20
    
    // High-frequency "micro-spike" texture for natural jaggedness
    const microSpikes = Math.sin(angle * 45 + elapsed * 0.01) * 2.0 * intensity

    const totalDisplacement = attraction + (spikeFactor * intensity * 20) + microSpikes
    
    // Final displacements oriented along the magnetic field line
    const spikeDx = (dxMouse / distMouse) * totalDisplacement
    const spikeDy = (dyMouse / distMouse) * totalDisplacement
    
    // Background breathing/shimmering
    const shiver = Math.sin(elapsed * 0.02 + phase) * 1.5
    
    // Ferrofluid is STIFF and snappy
    const springScale = 1.2 + intensity * 0.8

    return { 
      dx: spikeDx + shiver * 0.5, 
      dy: spikeDy + shiver * 0.5, 
      springScale 
    }
  },
}
