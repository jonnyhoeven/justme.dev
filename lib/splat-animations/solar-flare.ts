import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Solar Flare Animation
 *
 * Periodically triggers an energetic radial shockwave that ejects
 * particles outward with a bright solar flash.
 * High energy, high impact.
 */
export const solarFlare: SplatAnimation = {
  name: 'Solar Flare',

  init() {
    // No specific per-particle setup needed
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const cyclePeriod = 6000; // Total cycle length (ms)
    const cycle = Math.floor(elapsed / cyclePeriod);
    const timeInCycle = elapsed % cyclePeriod;

    // Flare pulse happens at the start of the cycle
    const pulseDuration = 1800;

    // Subtle background drift (gentle breathing)
    const breatheT = elapsed * 0.001;
    const sdx = Math.sin(breatheT + p.ox * 0.05) * 0.5;
    const sdy = Math.cos(breatheT + p.oy * 0.05) * 0.5;

    if (timeInCycle < pulseDuration) {
      // Deterministic origin per cycle (within 100-220 range in 320 space)
      const originX = 160 + Math.sin(cycle * 13.5) * 80;
      const originY = 160 + Math.cos(cycle * 7.2) * 80;

      const pdx = p.ox - originX;
      const pdy = p.oy - originY;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);

      // Shockwave expansion logic
      const waveSpeed = 0.22; // units per ms
      const waveRadius = timeInCycle * waveSpeed;
      const waveWidth = 45; // width of the "kick" zone

      const distFromWave = Math.abs(dist - waveRadius);

      if (dist < waveRadius && distFromWave < waveWidth) {
        const strength = 1 - distFromWave / waveWidth;
        const outwardX = pdx / (dist || 0.1);
        const outwardY = pdy / (dist || 0.1);

        // Boost spring scale temporarily to snap back after the kick
        const springScale = 0.5 + (1 - strength) * 0.5;

        // Solar colors: interpolating towards bright white / yellow
        const r = 255;
        const g = Math.floor(180 + strength * 75);
        const b = Math.floor(100 + strength * 155);

        return {
          dx: sdx * ctx.scale,
          dy: sdy * ctx.scale,
          nudgeVx: outwardX * strength * 4,
          nudgeVy: outwardY * strength * 4,
          springScale,
          colorOverride: `${r}, ${g}, ${b}`
        };
      }
    }

    return {
      dx: sdx * ctx.scale,
      dy: sdy * ctx.scale
    };
  }
};
