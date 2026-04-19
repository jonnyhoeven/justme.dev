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

// --- Tuning Parameters ---
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 320;
const BASE_DEPTH_OFFSET = 50;
const ENTANGLEMENT_POS_MULT = 0.5;
const PHASE_SPACE_MULT = 0.01;
const BASS_Z_MULT = 40;
const Z_TIME_MULT = 0.003;
const MID_Z_MULT = 20;
const ENTANGLEMENT_Z_MULT = 0.3;
const DRIFT_TIME_BASE = 0.001;
const BASS_DRIFT_TIME_MULT = 0.035;
const DRIFT_AMP_BASE = 2;
const BASS_DRIFT_AMP_MULT = 30;
const PHASE_Y_MULT = 1.5;
const TREBLE_JITTER_MULT = 10.0;
const SIZE_MIN = 0.4;
const SIZE_MAX = 2.5;
const SIZE_Z_DIVISOR = 150;
const SPRING_BASE = 0.7;
const BASS_SPRING_MULT = 0.3;

export const quantumEntanglement: SplatAnimation = {
  name: 'Quantum Entanglement',

  init(particles: SplatParticle[]) {
    // Find closest mirror-point partner for each particle (O(N^2) but small N)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.animState.individualPhase = Math.random() * Math.PI * 2;
      p.animState.pz = (Math.random() - 0.5) * BASE_DEPTH_OFFSET; // Base depth offset

      const tx = CANVAS_WIDTH - p.ox;
      const ty = CANVAS_HEIGHT - p.oy;

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
      p.animState.partnerIdx = partnerIdx;
    }
  },

  /**
   * Pre-pass to compute entanglement forces.
   * This eliminates frame-order dependency where a particle's displacement
   * would depend on whether its partner had already been updated this frame.
   *
   * While random access via partnerIdx is cache-unfriendly, it is efficient
   * enough for the current particle count (~500).
   */
  beforeFrame(
    particles: SplatParticle[],
    elapsed: number,
    ctx: AnimationContext
  ) {
    const { scale, offsetX, offsetY, audioLevels: levels } = ctx;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const partnerIdx = p.animState.partnerIdx;
      if (partnerIdx !== undefined && partnerIdx >= 0) {
        const partner = particles[partnerIdx];

        // Capture partner's displacement from its target origin
        const p_targetOx = partner.ox * scale + offsetX;
        const p_targetOy = partner.oy * scale + offsetY;

        const pdx = partner.x - p_targetOx;
        const pdy = partner.y - p_targetOy;

        p.animState.qdx = -pdx * ENTANGLEMENT_POS_MULT;
        p.animState.qdy = -pdy * ENTANGLEMENT_POS_MULT;

        // Mirror the music-driven depth change from partner (inverted)
        const pPhase =
          (partner.animState.individualPhase ?? 0) +
          partner.ox * PHASE_SPACE_MULT;
        const pzMusic =
          levels.bass * BASS_Z_MULT +
          Math.sin(elapsed * Z_TIME_MULT + pPhase) * (levels.mid * MID_Z_MULT);
        p.animState.qdz = -pzMusic * ENTANGLEMENT_Z_MULT;
      } else {
        p.animState.qdx = 0;
        p.animState.qdy = 0;
        p.animState.qdz = 0;
      }
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // Individual decoupled drift - Bass increases the drift speed/amp
    const driftT =
      elapsed * (DRIFT_TIME_BASE + levels.bass * BASS_DRIFT_TIME_MULT);
    const phase = (p.animState.individualPhase ?? 0) + p.ox * PHASE_SPACE_MULT;
    const sdx =
      Math.sin(driftT + phase) *
      (DRIFT_AMP_BASE + levels.bass * BASS_DRIFT_AMP_MULT);
    const sdy =
      Math.cos(driftT + phase * PHASE_Y_MULT) *
      (DRIFT_AMP_BASE + levels.bass * BASS_DRIFT_AMP_MULT);

    // Quantum Jitter: High-frequency noise driven by treble
    const jitter = levels.treble * TREBLE_JITTER_MULT;
    const jdx = (Math.random() - 0.5) * jitter;
    const jdy = (Math.random() - 0.5) * jitter;

    // Depth effect: Pulsing and music-driven depth
    const zBase = p.animState.pz ?? 0;
    const zMusic =
      levels.bass * BASS_Z_MULT +
      Math.sin(elapsed * Z_TIME_MULT + phase) * (levels.mid * MID_Z_MULT);
    let totalZ = zBase + zMusic;

    // Use pre-computed quantum state
    const qdx = p.animState.qdx ?? 0;
    const qdy = p.animState.qdy ?? 0;
    const qdz = p.animState.qdz ?? 0;

    totalZ += qdz;

    // Perspective size multiplier
    const sizeMult = Math.max(
      SIZE_MIN,
      Math.min(SIZE_MAX, 1.0 + totalZ / SIZE_Z_DIVISOR)
    );

    return {
      dx: (sdx + jdx) * scale + qdx,
      dy: (sdy + jdy) * scale + qdy,
      sizeMult: sizeMult,
      springScale: SPRING_BASE - levels.bass * BASS_SPRING_MULT // Looser on bass drops
    };
  }
};
