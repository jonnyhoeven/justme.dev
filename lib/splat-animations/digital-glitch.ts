wimport type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types'

/**
 * Digital Glitch (Lightning Spike Edition)
 * 
 * High-intensity, jittery corruption.
 * When a glitch hits, ALL particles spike in random, jagged directions 
 * like lightning and then snap back almost instantly.
 */
export const digitalGlitch: SplatAnimation = {
  name: 'Digital Glitch',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.glitchSeed = Math.random()
      p.glitchSensitivity = 0.5 + Math.random() * 0.5
    }
  },

  apply(p: SplatParticle, elapsed: number, ctx: AnimationContext): AnimationEffect {
    const seed = p.glitchSeed ?? 0.5
    const sensitivity = p.glitchSensitivity ?? 0.8

    // 1. Chaotic Signal Noise base
    const baseT = elapsed * 0.003
    const noiseX = Math.sin(baseT + seed * 20) * 2
    const noiseY = Math.cos(baseT + seed * 20) * 2

    // 2. Multi-stage Glitch Window (Short, sharp bursts)
    const pattern = Math.sin(elapsed * 0.004) + Math.sin(elapsed * 0.009)
    const isGlitching = pattern > 1.7

    let gdx = 0
    let gdy = 0
    let color: string | undefined = undefined
    let springScale = 1.0

    if (isGlitching) {
      // Very loose spring during the actual spike to allow the jump
      springScale = 0.01
    } else {
      // --- Snap Back ---
      // Use a very high spring scale immediately after glitch to "snap" back
      // We detect the "just finished glitching" state by checking if pattern is close to threshold
      const nearGlitch = pattern > 1.5
      springScale = nearGlitch ? 0.3 : 1.2 // 1.2 is tight and responsive

      // Add tiny bit-crush jitter even in idle
      if (Math.random() < 0.01) {
        gdx = (Math.random() - 0.5) * 10
      }
    }

    return {
      dx: (noiseX + gdx) * ctx.scale,
      dy: (noiseY + gdy) * ctx.scale,
      colorOverride: color,
      springScale
    }
  }
}
