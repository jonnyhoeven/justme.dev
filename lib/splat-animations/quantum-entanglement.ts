import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Quantum Entanglement
 *
 * Particles are linked to their spatial mirror-partner.
 * When a particle drifts or is repelled, its partner on the other
 * side of the image has a mirror-image response.
 */
export const quantumEntanglement: SplatAnimation = {
  name: 'Quantum Entanglement',

  init(particles: SplatParticle[]) {
    // Find closest mirror-point partner for each particle (O(N^2) but small N)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const tx = 320 - p.ox;
      const ty = 320 - p.oy;

      let minDist = Infinity;
      let partnerIdx = -1;

      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const p2 = particles[j];
        const d2 = (p2.ox - tx) ** 2 + (p2.oy - ty) ** 2;
        if (d2 < minDist) {
          minDist = d2;
          partnerIdx = j;
        }
      }
      p.partnerIdx = partnerIdx;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext,
    particles: SplatParticle[]
  ): AnimationEffect {
    // Basic gentle drift for everyone
    const driftT = elapsed * 0.001;
    const sdx = Math.sin(driftT + p.ox * 0.02) * 2;
    const sdy = Math.cos(driftT + p.oy * 0.02) * 2;

    // Quantum Effect: mirror the displacement of the partner
    let qdx = 0;
    let qdy = 0;

    if (p.partnerIdx !== undefined && p.partnerIdx >= 0) {
      const partner = particles[p.partnerIdx];
      // If partner has moved from their origin, we mirror that movement
      // We look at their CURRENT x/y relative to their starting ox/oy (in screen space)
      const scale = ctx.scale;
      const p_targetOx = partner.ox * scale + ctx.offsetX;
      const p_targetOy = partner.oy * scale + ctx.offsetY;

      // Displacement of partner from their base target
      const pdx = partner.x - p_targetOx;
      const pdy = partner.y - p_targetOy;

      // Mirror the displacement (A moves right, B moves left)
      qdx = -pdx * 0.5;
      qdy = -pdy * 0.5;
    }

    return {
      dx: sdx * ctx.scale + qdx,
      dy: sdy * ctx.scale + qdy,
      springScale: 0.8 // Slightly looser to allow the mirrored movement to stay visible
    };
  }
};
