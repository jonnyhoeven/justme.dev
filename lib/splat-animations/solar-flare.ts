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
    const cyclePeriod = 6000;
    const timeInCycle = elapsed % cyclePeriod;
    const { audioData, scale } = ctx;

    // --- Audio Pulse Detection ---
    let audioPulseActive = false;
    let audioStrength = 0;
    if (audioData) {
      const bass = (audioData[0] + audioData[1] + audioData[2]) / 3;
      if (bass > 200) {
        audioPulseActive = true;
        audioStrength = (bass - 200) / 55;
      }
    }

    // Flare pulse happens at the start of the cycle OR on audio pulse
    const pulseDuration = 1800;
    const isFlareActive = timeInCycle < pulseDuration || audioPulseActive;

    // Subtle background drift
    const breatheT = elapsed * 0.001;
    const sdx = Math.sin(breatheT + p.ox * 0.05) * 0.5;
    const sdy = Math.cos(breatheT + p.oy * 0.05) * 0.5;

    if (isFlareActive) {
      // If audio pulse, use mouse or center as origin, otherwise use cycle origin
      let originX = 160;
      let originY = 160;

      if (audioPulseActive) {
        originX = ctx.mouseX / scale;
        originY = ctx.mouseY / scale;
      } else {
        const cycle = Math.floor(elapsed / cyclePeriod);
        originX = 160 + Math.sin(cycle * 13.5) * 80;
        originY = 160 + Math.cos(cycle * 7.2) * 80;
      }

      const pdx = p.ox - originX;
      const pdy = p.oy - originY;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);

      // Shockwave expansion
      const waveSpeed = audioPulseActive ? 0.4 : 0.22;
      const waveRadius = audioPulseActive
        ? (elapsed % 500) * waveSpeed // rapid pulses
        : timeInCycle * waveSpeed;
      const waveWidth = 45;

      const distFromWave = Math.abs(dist - waveRadius);

      if (dist < waveRadius && distFromWave < waveWidth) {
        const strength =
          (1 - distFromWave / waveWidth) *
          (audioPulseActive ? audioStrength : 1);
        const outwardX = pdx / (dist || 0.1);
        const outwardY = pdy / (dist || 0.1);

        const springScale = 0.5 + (1 - strength) * 0.5;

        // Solar colors: interpolating towards bright white / yellow
        const r = 255;
        const g = Math.floor(180 + strength * 75);
        const b = Math.floor(100 + strength * 155);

        return {
          dx: sdx * scale,
          dy: sdy * scale,
          nudgeVx: outwardX * strength * (audioPulseActive ? 8 : 4),
          nudgeVy: outwardY * strength * (audioPulseActive ? 8 : 4),
          springScale,
          colorOverride: `${r}, ${g}, ${b}`
        };
      }
    }

    return {
      dx: sdx * scale,
      dy: sdy * scale
    };
  }
};
