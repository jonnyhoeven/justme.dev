import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { getPeak } from './audio-utils';

interface FlarePulse {
  startTime: number;
  originX: number;
  originY: number;
  strength: number;
  duration: number;
}

// Module-level state to track multiple waves
let activePulses: FlarePulse[] = [];
let lastUpdateElapsed = -1;
let lastBeatTime = 0;
const BEAT_COOLDOWN = 250; // Minimum time between beat-driven waves

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
    activePulses = [];
    lastUpdateElapsed = -1;
    lastBeatTime = 0;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale, mouseX, mouseY } = ctx;
    const levels = ctx.audioLevels;
    const audioPeak = getPeak(levels.bass, 0.5);

    // 1. One-shot update per frame to manage pulses
    // This runs once per frame regardless of how many particles call apply()
    if (elapsed !== lastUpdateElapsed) {
      lastUpdateElapsed = elapsed;

      // Handle the Periodic "Natural" Flare (The Background Cycle)
      const cyclePeriod = 3000;
      const timeInCycle = elapsed % cyclePeriod;
      // Trigger a larger 'natural' flare at the start of every cycle
      if (timeInCycle < 50 && elapsed > 100) {
        const cycle = Math.floor(elapsed / cyclePeriod);
        activePulses.push({
          startTime: elapsed,
          originX: 160 + Math.sin(cycle * 13.5) * 20,
          originY: 160 + Math.cos(cycle * 7.2) * 20,
          strength: 1.2,
          duration: 2000 // Lasts longer for big propagation
        });
      }

      // Handle Audio Beats (Multiple Waves triggered by music)
      if (audioPeak > 0.05 && elapsed - lastBeatTime > BEAT_COOLDOWN) {
        lastBeatTime = elapsed;

        // Origin follows mouse if on screen, otherwise random spot
        let tx = Math.random() * 240 + 40;
        let ty = Math.random() * 240 + 40;
        if (mouseX > 0 && mouseY > 0) {
          tx = mouseX / scale;
          ty = mouseY / scale;
        }

        activePulses.push({
          startTime: elapsed,
          originX: tx,
          originY: ty,
          strength: audioPeak * 1.8,
          duration: 2000
        });
      }

      // Cleanup finished pulses and limit total count for performance
      activePulses = activePulses.filter(
        (pulse) => elapsed - pulse.startTime < pulse.duration
      );
      if (activePulses.length > 12) {
        activePulses.shift();
      }
    }

    // 2. Perpetual Surface Movement (The "Solar Simmer")
    // Inactive pixels now have dynamic randomness based on audio volume/treble
    const slowT = elapsed * 0.0007;
    const fastT = elapsed * 0.004;
    const simmerIntensity = 0.4 + levels.volume * 2.5;
    const trebleNoise = levels.treble * 5.0;

    // Per-particle base drift + noise
    const sdx =
      Math.sin(slowT + p.ox * 0.02) * 0.3 +
      Math.sin(fastT * 0.8 + p.oy * 0.12) * 0.3 * simmerIntensity +
      (Math.random() - 0.5) * trebleNoise;
    const sdy =
      Math.cos(slowT + p.oy * 0.02) * 0.3 +
      Math.cos(fastT * 0.7 + p.ox * 0.12) * 0.3 * simmerIntensity +
      (Math.random() - 0.5) * trebleNoise;

    // 3. Find the Dominant Flare Contribution for this Particle
    let bestNudgeX = 0;
    let bestNudgeY = 0;
    let bestStrength = 0;
    let minSpringScale = 1.0;

    const WAVE_SPEED = 0.07; // Majestic solarwave propagation
    const WAVE_WIDTH = 55; // Visual width (color/glow)
    const KICK_WIDTH = 12; // Physical width (velocity nudge)

    for (let i = 0; i < activePulses.length; i++) {
      const pulse = activePulses[i];
      const pdx = p.ox - pulse.originX;
      const pdy = p.oy - pulse.originY;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);

      const life = elapsed - pulse.startTime;
      const waveRadius = life * WAVE_SPEED;
      const distFromWave = Math.abs(dist - waveRadius);

      // Effect falls off as it travels and fades over time
      if (dist < waveRadius + WAVE_WIDTH && distFromWave < WAVE_WIDTH) {
        const lifeFactor = Math.max(0, 1 - life / pulse.duration);
        const waveFactor = 1 - distFromWave / WAVE_WIDTH;
        const currentStrength = waveFactor * pulse.strength * lifeFactor;

        // Narrow physical kick: only push at the leading edge
        const kickFactor =
          distFromWave < KICK_WIDTH ? 1 - distFromWave / KICK_WIDTH : 0;
        const currentKick = kickFactor * pulse.strength * lifeFactor;

        // Dominant wave logic
        if (currentStrength > bestStrength) {
          bestStrength = currentStrength;

          const outwardX = pdx / (dist || 0.1);
          const outwardY = pdy / (dist || 0.1);

          // Significantly lower nudge because waves are slow (impulse builds up over many frames)
          bestNudgeX = outwardX * currentKick * 1.5;
          bestNudgeY = outwardY * currentKick * 1.5;
          minSpringScale = 0.4 + (1 - currentStrength) * 0.6;
        }
      }
    }

    // 4. Return Final Combined Effect
    if (bestStrength > 0.01) {
      // Use base color and increase brightness/whiteness based on bestStrength
      const { cr: br, cg: bg, cb: bb } = p;

      const r =
        Math.min(255, Math.floor(br + (255 - br) * bestStrength)) & 0xf8;
      const g =
        Math.min(255, Math.floor(bg + (255 - bg) * bestStrength)) & 0xf8;
      const b =
        Math.min(255, Math.floor(bb + (255 - bb) * bestStrength)) & 0xf8;

      return {
        dx: sdx * scale,
        dy: sdy * scale,
        nudgeVx: bestNudgeX,
        nudgeVy: bestNudgeY,
        springScale: minSpringScale,
        colorOverride: `${r}, ${g}, ${b}`
      };
    }

    return {
      dx: sdx * scale,
      dy: sdy * scale
    };
  }
};
