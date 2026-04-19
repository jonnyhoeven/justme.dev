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
      p.individualPhase = Math.random() * Math.PI * 2;
      p.pz = (Math.random() - 0.5) * 50; // Base depth offset

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
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // Individual decoupled drift - Bass increases the drift speed/amp
    // We use p.individualPhase to ensure they don't move in a rigid wave
    const driftT = elapsed * (0.001 + levels.bass * 0.035);
    const phase = (p.individualPhase ?? 0) + p.ox * 0.01;
    const sdx = Math.sin(driftT + phase) * (2 + levels.bass * 30);
    const sdy = Math.cos(driftT + phase * 1.5) * (2 + levels.bass * 30);

    // Quantum Jitter: High-frequency noise driven by treble
    const jitter = levels.treble * 10.0;
    const jdx = (Math.random() - 0.5) * jitter;
    const jdy = (Math.random() - 0.5) * jitter;

    // Depth effect: Pulsing and music-driven depth
    // Bass pushes things "forward" (larger), mid adds wobble
    const zBase = p.pz ?? 0;
    const zMusic =
      levels.bass * 40 + Math.sin(elapsed * 0.003 + phase) * (levels.mid * 20);
    let totalZ = zBase + zMusic;

    // Quantum Effect: mirror the displacement AND depth of the partner
    let qdx = 0;
    let qdy = 0;
    let qdz = 0;

    if (p.partnerIdx !== undefined && p.partnerIdx >= 0) {
      const partner = particles[p.partnerIdx];
      // Mirror displacement
      const p_targetOx = partner.ox * scale + ctx.offsetX;
      const p_targetOy = partner.oy * scale + ctx.offsetY;

      const pdx = partner.x - p_targetOx;
      const pdy = partner.y - p_targetOy;

      qdx = -pdx * 0.5;
      qdy = -pdy * 0.5;

      // Mirror the music-driven depth change from partner (inverted)
      const p_phase = (partner.individualPhase ?? 0) + partner.ox * 0.01;
      const p_zMusic =
        levels.bass * 40 +
        Math.sin(elapsed * 0.003 + p_phase) * (levels.mid * 20);
      qdz = -p_zMusic * 0.3;
    }

    totalZ += qdz;

    // Perspective size multiplier
    const sizeMult = Math.max(0.4, Math.min(2.5, 1.0 + totalZ / 150));

    return {
      dx: (sdx + jdx) * scale + qdx,
      dy: (sdy + jdy) * scale + qdy,
      sizeMult: sizeMult,
      springScale: 0.7 - levels.bass * 0.3 // Looser on bass drops
    };
  }
};
