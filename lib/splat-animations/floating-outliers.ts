import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Floating Outliers
 *
 * ~40% of particles are tagged as "outliers".
 * They use a much weaker spring so they drift lazily, and receive
 * random velocity nudges driven by audio bass.
 *
 * Non-outlier particles behave normally with a subtle shiver.
 */
export const floatingOutliers: SplatAnimation = {
  name: 'Floating Outliers',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.isOutlier = Math.random() < 0.4;
      p.outlierPhase = Math.random() * Math.PI * 2;
      p.wanderFreq = 0.0003 + Math.random() * 0.0005;
      p.wanderAmp = 6 + Math.random() * 8;
      p.coreWobblePhase = Math.random() * Math.PI * 2;
      p.pz = (Math.random() - 0.5) * 60; // Base depth
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // ---- Outlier behavior: Active Wandering Satellite ----
    if (p.isOutlier) {
      const phase = p.outlierPhase ?? 0;
      const freq = p.wanderFreq ?? 0.0004;
      const amp = (p.wanderAmp ?? 10) + levels.bass * 45; // Bass expands wander range

      // Slow, organic wander (drift)
      const dx = Math.sin(elapsed * freq + phase) * amp;
      const dy = Math.cos(elapsed * freq * 0.7 + phase) * amp;

      // Weak spring
      const springScale = 0.08 - levels.bass * 0.05;

      // Bass-driven velocity pulse
      let nudgeVx = 0;
      let nudgeVy = 0;
      // High bass levels trigger more frequent nudges
      const nudgeChance = 0.0008 + levels.bass * 0.06;
      if (Math.random() < nudgeChance) {
        nudgeVx = (Math.random() - 0.5) * (0.8 + levels.bass * 12);
        nudgeVy = (Math.random() - 0.5) * (0.8 + levels.bass * 12);
      }

      // Outliers have more distinct size changes
      const distPhase = Math.sin(elapsed * 0.002 + phase);
      const sizeMult = 1.1 + levels.bass * 0.5 + distPhase * 0.2;

      return {
        dx: dx * scale,
        dy: dy * scale,
        springScale,
        nudgeVx,
        nudgeVy,
        sizeMult
      };
    }

    // ---- Core behavior: Subtle Shiver/Wobble driven by Treble ----
    const wobblePhase = p.coreWobblePhase ?? 0;
    const audioShiver = levels.treble * 5.0 + levels.mid * 2.0;
    const wobbleX =
      Math.sin(elapsed * 0.003 + wobblePhase) * (0.5 + audioShiver);
    const wobbleY =
      Math.cos(elapsed * 0.002 + wobblePhase) * (0.5 + audioShiver);

    // Subtle depth pulse for core particles
    const sizeMult = 0.95 + levels.mid * 0.15 + (p.pz ?? 0) / 400;

    return {
      dx: wobbleX * scale,
      dy: wobbleY * scale,
      sizeMult,
      springScale: 1.0
    };
  }
};
