import type { 
  SplatAnimation, 
  SplatParticle, 
  AnimationEffect, 
  AnimationContext 
} from './types'

/**
 * Event Horizon (High Energy Edition)
 * 
 * Particles are drawn into a spinning accretion disk. 
 * Increased centripetal pull, faster tangential spin, and chaotic 
 * radius oscillations create a high-gravity visual storm.
 */
export const eventHorizon: SplatAnimation = {
  name: 'Event Horizon',

  init() {
    // No per-particle setup needed for now
  },

  apply(p: SplatParticle, elapsed: number, ctx: AnimationContext): AnimationEffect {
    // SINGULARITY point (320x320 space)
    const cx = 160
    const cy = 160
    
    // Singularity follows mouse if it's over the canvas
    const mouseX_norm = (ctx.mouseX - ctx.offsetX) / ctx.scale
    const mouseY_norm = (ctx.mouseY - ctx.offsetY) / ctx.scale
    const isMouseInside = mouseX_norm > -40 && mouseX_norm < 360 && mouseY_norm > -40 && mouseY_norm < 360
    
    const targetX = isMouseInside ? mouseX_norm : cx
    const targetY = isMouseInside ? mouseY_norm : cy
    
    const dx = p.ox - targetX
    const dy = p.oy - targetY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    // --- High Gravity Pull ---
    const gravityForce = 8 / (dist + 15) // Increased pull
    
    // --- High Speed Tangential Swirl ---
    const spinT = elapsed * 0.001
    const spinFactor = 65 / (dist + 5) // Much faster spin closer to the center
    const angleOffset = dist * 0.04 + spinT * spinFactor
    
    // --- Radius Wobble (Adds "Energy" and Noise) ---
    // Simulates turbulent gas in the accretion disk
    const wobble = Math.sin(spinT * 5 + dist * 0.1) * 0.15
    const dynamicRadiusScale = 0.25 * (1 + wobble)

    const finalDx = Math.cos(angleOffset) * dist * dynamicRadiusScale - dx * (0.2 + gravityForce * 0.1)
    const finalDy = Math.sin(angleOffset) * dist * dynamicRadiusScale - dy * (0.2 + gravityForce * 0.1)

    // Heat Glow: particles in the high-gravity zone glow brighter
    let color: string | undefined = undefined
    if (dist < 40 && Math.random() < 0.2) {
        color = "255, 255, 255" // Particle "incandescing" in the disk
    }

    return {
      dx: finalDx * ctx.scale,
      dy: finalDy * ctx.scale,
      colorOverride: color,
      springScale: 0.15 // Slightly looser for more fluid/swirly motion
    }
  }
}
