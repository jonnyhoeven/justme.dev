import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { getPeak } from './audio-utils';
import { lerpToWhite } from './color-utils';

interface FlarePulse {
  startTime: number;
  originX: number;
  originY: number;
  strength: number;
  duration: number;
}

/**
 * Solar Flare Animation
 *
 * Periodically triggers an energetic radial shockwave that ejects
 * particles outward with a bright solar flash.
 * High energy, high impact.
 */

// --- Tuning Parameters ---
const CYCLE_PERIOD = 3000;
const CYCLE_START_THRES = 50;
const CYCLE_MIN_ELAPSED = 100;
const CYCLE_CENTER = 160;
const CYCLE_RADIUS = 20;
const CYCLE_PHASE_X = 13.5;
const CYCLE_PHASE_Y = 7.2;
const CYCLE_STRENGTH = 1.2;
const CYCLE_DURATION = 2000;
const AUDIO_PEAK_THRES = 0.05;
const BEAT_COOLDOWN = 300;
const RAND_POS_RANGE = 240;
const RAND_POS_BASE = 40;
const AUDIO_STRENGTH_MULT = 1.8;
const AUDIO_DURATION = 2000;
const MAX_ACTIVE_PULSES = 12;
const SIMMER_TIME_SLOW = 0.0007;
const SIMMER_TIME_FAST = 0.004;
const SIMMER_BASE_INTENSITY = 0.4;
const SIMMER_VOL_MULT = 2.5;
const TREBLE_NOISE_MULT = 5.0;
const DRIFT_BASE_AMP = 0.3;
const DRIFT_SPACE_SLOW = 0.02;
const DRIFT_SPACE_FAST = 0.12;
const SIMMER_PHASE_X = 0.8;
const SIMMER_PHASE_Y = 0.7;
const WAVE_SPEED = 0.07;
const WAVE_WIDTH = 55;
const KICK_WIDTH = 12;
const NUDGE_MULT = 1.5;
const SPRING_SCALE_BASE = 0.4;
const SPRING_SCALE_VAR = 0.6;
const MIN_STRENGTH_THRES = 0.01;

export function createSolarFlareState() {
  return {
    activePulses: [] as FlarePulse[],
    lastUpdateElapsed: -1,
    lastBeatTime: 0
  };
}

export const solarFlare: SplatAnimation = {
  name: 'Solar Flare',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.animState.solarFlare = createSolarFlareState();
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale, mouseX, mouseY } = ctx;
    const levels = ctx.audioLevels;
    const audioPeak = getPeak(levels.bass, 0.5);

    const state = p.animState.solarFlare;
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // 1. One-shot update per frame to manage pulses
    // This runs once per frame regardless of how many particles call apply()
    if (elapsed !== state.lastUpdateElapsed) {
      state.lastUpdateElapsed = elapsed;

      // Handle the Periodic "Natural" Flare (The Background Cycle)
      const cyclePeriod = CYCLE_PERIOD;
      const timeInCycle = elapsed % cyclePeriod;
      // Trigger a larger 'natural' flare at the start of every cycle
      if (timeInCycle < CYCLE_START_THRES && elapsed > CYCLE_MIN_ELAPSED) {
        const cycle = Math.floor(elapsed / cyclePeriod);
        state.activePulses.push({
          startTime: elapsed,
          originX:
            CYCLE_CENTER + Math.sin(cycle * CYCLE_PHASE_X) * CYCLE_RADIUS,
          originY:
            CYCLE_CENTER + Math.cos(cycle * CYCLE_PHASE_Y) * CYCLE_RADIUS,
          strength: CYCLE_STRENGTH,
          duration: CYCLE_DURATION // Lasts longer for big propagation
        });
      }

      // Handle Audio Beats (Multiple Waves triggered by music)
      if (
        audioPeak > AUDIO_PEAK_THRES &&
        elapsed - state.lastBeatTime > BEAT_COOLDOWN
      ) {
        state.lastBeatTime = elapsed;

        // Origin follows mouse if on screen, otherwise deterministic random spot based on elapsed
        let tx = pseudoRandom(elapsed * 1.1) * RAND_POS_RANGE + RAND_POS_BASE;
        let ty = pseudoRandom(elapsed * 1.2) * RAND_POS_RANGE + RAND_POS_BASE;
        if (mouseX > 0 && mouseY > 0) {
          tx = mouseX / scale;
          ty = mouseY / scale;
        }

        state.activePulses.push({
          startTime: elapsed,
          originX: tx,
          originY: ty,
          strength: audioPeak * AUDIO_STRENGTH_MULT,
          duration: AUDIO_DURATION
        });
      }

      // Cleanup finished pulses and limit total count for performance
      state.activePulses = state.activePulses.filter(
        (pulse: FlarePulse) => elapsed - pulse.startTime < pulse.duration
      );
      if (state.activePulses.length > MAX_ACTIVE_PULSES) {
        state.activePulses.shift();
      }
    }

    // 2. Perpetual Surface Movement (The "Solar Simmer")
    // Inactive pixels now have dynamic randomness based on audio volume/treble
    const slowT = elapsed * SIMMER_TIME_SLOW;
    const fastT = elapsed * SIMMER_TIME_FAST;
    const simmerIntensity =
      SIMMER_BASE_INTENSITY + levels.volume * SIMMER_VOL_MULT;
    const trebleNoise = levels.treble * TREBLE_NOISE_MULT;

    // Per-particle base drift + noise
    const sdx =
      Math.sin(slowT + p.ox * DRIFT_SPACE_SLOW) * DRIFT_BASE_AMP +
      Math.sin(fastT * SIMMER_PHASE_X + p.oy * DRIFT_SPACE_FAST) *
        DRIFT_BASE_AMP *
        simmerIntensity +
      (Math.random() - 0.5) * trebleNoise;
    const sdy =
      Math.cos(slowT + p.oy * DRIFT_SPACE_SLOW) * DRIFT_BASE_AMP +
      Math.cos(fastT * SIMMER_PHASE_Y + p.ox * DRIFT_SPACE_FAST) *
        DRIFT_BASE_AMP *
        simmerIntensity +
      (Math.random() - 0.5) * trebleNoise;

    // 3. Find the Dominant Flare Contribution for this Particle
    let bestNudgeX = 0;
    let bestNudgeY = 0;
    let bestStrength = 0;
    let minSpringScale = 1.0;

    const waveSpeed = WAVE_SPEED; // Majestic solarwave propagation
    const waveWidth = WAVE_WIDTH; // Visual width (color/glow)
    const kickWidth = KICK_WIDTH; // Physical width (velocity nudge)

    const activePulses = state.activePulses;
    for (let i = 0; i < activePulses.length; i++) {
      const pulse = activePulses[i];
      const pdx = p.ox - pulse.originX;
      const pdy = p.oy - pulse.originY;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);

      const life = elapsed - pulse.startTime;
      const waveRadius = life * waveSpeed;
      const distFromWave = Math.abs(dist - waveRadius);

      // Effect falls off as it travels and fades over time
      if (dist < waveRadius + waveWidth && distFromWave < waveWidth) {
        const lifeFactor = Math.max(0, 1 - life / pulse.duration);
        const waveFactor = 1 - distFromWave / waveWidth;
        const currentStrength = waveFactor * pulse.strength * lifeFactor;

        // Narrow physical kick: only push at the leading edge
        const kickFactor =
          distFromWave < kickWidth ? 1 - distFromWave / kickWidth : 0;
        const currentKick = kickFactor * pulse.strength * lifeFactor;

        // Dominant wave logic
        if (currentStrength > bestStrength) {
          bestStrength = currentStrength;

          const outwardX = pdx / (dist || 0.1);
          const outwardY = pdy / (dist || 0.1);

          // Significantly lower nudge because waves are slow (impulse builds up over many frames)
          bestNudgeX = outwardX * currentKick * NUDGE_MULT;
          bestNudgeY = outwardY * currentKick * NUDGE_MULT;
          minSpringScale =
            SPRING_SCALE_BASE + (1 - currentStrength) * SPRING_SCALE_VAR;
        }
      }
    }

    // 4. Return Final Combined Effect
    if (bestStrength > MIN_STRENGTH_THRES) {
      return {
        dx: sdx * scale,
        dy: sdy * scale,
        nudgeVx: bestNudgeX,
        nudgeVy: bestNudgeY,
        springScale: minSpringScale,
        colorOverride: lerpToWhite(p.cr, p.cg, p.cb, bestStrength)
      };
    }

    return {
      dx: sdx * scale,
      dy: sdy * scale
    };
  }
};
