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
      p.orbitAngle = Math.atan2(
        p.oy - (p.orbitCy ?? 160),
        p.ox - (p.orbitCx ?? 160)
      );
      p.lastElapsed = 0;
      p.smoothedVolume = 0;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const cx = p.orbitCx ?? 160;
    const cy = p.orbitCy ?? 160;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // --- Smoothing & Reactive Timing ---
    const dt = elapsed - (p.lastElapsed ?? 0);
    p.lastElapsed = elapsed;

    // Smoothing factor for volume
    p.smoothedVolume = (p.smoothedVolume ?? 0) * 0.98 + levels.volume * 0.02;
    const sVol = p.smoothedVolume;

    // --- Dynamic Direction & Speed ---
    // We use a very slow oscillation to change direction every ~40-60 seconds
    const oscillationSpeed = 0.0001 + levels.bass * 0.00005;
    const directionMult = Math.cos(elapsed * oscillationSpeed);

    const baseSpeed = p.orbitSpeed ?? 0.00005;
    // Speed up rotation based on smoothed volume, but respect the oscillating direction
    const musicSpeedBoost = sVol * 0.005;
    const currentSpeed = (baseSpeed + musicSpeedBoost) * directionMult;

    // Increment angle based on delta time
    p.orbitAngle = (p.orbitAngle ?? 0) + dt * currentSpeed;

    // --- Radial Zoom Out ---
    const dist = Math.sqrt((p.ox - cx) ** 2 + (p.oy - cy) ** 2);
    // Subtle breathing/zoom expansion
    const zoomFactor = 1.0 + sVol * 0.12;
    const currentDist = dist * zoomFactor;

    const newOx = cx + Math.cos(p.orbitAngle) * currentDist;
    const newOy = cy + Math.sin(p.orbitAngle) * currentDist;

    // Depth effect: further particles (smaller orbits) are slightly different size
    const sizeMult =
      1.0 + sVol * 0.1 + Math.sin(elapsed * 0.001 + p.ox * 0.01) * 0.05;

    return {
      dx: (newOx - p.ox) * scale,
      dy: (newOy - p.oy) * scale,
      sizeMult: sizeMult
    };
  }
};
