import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Slow Orbital Drift
 *
 * Particles imperceptibly orbit around the image center,
 * giving the portrait a subtle rotating shimmer.
 * Full revolution takes ~2 minutes — almost invisible.
 */
export const orbitalDrift: SplatAnimation = {
  name: 'Orbital Drift',

  init(particles: SplatParticle[]) {
    const globalDir = Math.random() > 0.5 ? 1 : -1;
    for (const p of particles) {
      // Each particle gets a unique center point ±20px from true 160, 160
      p.orbitCx = 160 + (Math.random() - 0.5) * 40;
      p.orbitCy = 160 + (Math.random() - 0.5) * 40;
      // Random direction (global for this session) + variation
      p.orbitSpeed = globalDir * (0.00003 + Math.random() * 0.00004);
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const cx = p.orbitCx ?? 160;
    const cy = p.orbitCy ?? 160;
    const speed = p.orbitSpeed ?? 0.00005;

    const dist = Math.sqrt((p.ox - cx) ** 2 + (p.oy - cy) ** 2);
    const baseAngle = Math.atan2(p.oy - cy, p.ox - cx);

    const drift = elapsed * speed;
    const newAngle = baseAngle + drift;

    const newOx = cx + Math.cos(newAngle) * dist;
    const newOy = cy + Math.sin(newAngle) * dist;

    return {
      dx: (newOx - p.ox) * ctx.scale,
      dy: (newOy - p.oy) * ctx.scale
    };
  }
};
