import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Digital Glitch
 *
 * High-intensity, jittery corruption.
 * When a glitch hits, ALL particles spike in random, jagged directions
 * like lightning and then snap back almost instantly.
 */

// --- Tuning Parameters ---
const GLITCH_SENSITIVITY_BASE = 0.8;
const GLITCH_SENSITIVITY_VAR = 0.5;
const NOISE_TIME_MULT = 0.01;
const NOISE_PHASE_MULT = 100;
const FLOAT_X_TIME_MULT = 0.001;
const FLOAT_X_AMP = 2;
const FLOAT_Y_TIME_MULT = 0.0008;
const FLOAT_Y_AMP = 2;
const SHIVER_AMP = 1.5;
const SHIVER_Y_PHASE_MULT = 1.2;
const AUDIO_GLITCH_FACTOR_MULT = 1.5;
const AUDIO_JITTER_MULT = 18;
const PATTERN_SINE1_MULT = 0.004;
const PATTERN_SINE2_MULT = 0.009;
const GLITCH_THRESHOLD = 1.9;
const GLITCH_SPRING_SCALE = 0.01;
const GLITCH_X_AMP_BASE = 45;
const GLITCH_X_JITTER_MULT = 2.5;
const GLITCH_Y_AMP_BASE = 12;
const GLITCH_SIZE_BASE = 0.8;
const GLITCH_SIZE_VAR = 0.4;
const NEAR_GLITCH_THRESHOLD = 1.4;
const NEAR_GLITCH_SPRING = 0.3;
const IDLE_SPRING = 1.1;
const JITTER_X_MULT = 0.6;
const JITTER_Y_MULT = 0.3;
const SCANLINE_TIME_MULT = 0.05;
const SCANLINE_THRESHOLD = 0.99;
const SCANLINE_OFFSET_AMP = 15;
const DEPTH_BUZZ_TIME_MULT = 0.5;
const DEPTH_BUZZ_AMP = 0.05;
const DEPTH_MID_MULT = 0.1;

export const digitalGlitch: SplatAnimation = {
  name: 'Digital Glitch',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.animState.glitchSeed = Math.random();
      p.animState.glitchSensitivity =
        GLITCH_SENSITIVITY_BASE + Math.random() * GLITCH_SENSITIVITY_VAR;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const seed = p.animState.glitchSeed ?? 0.5;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // 1. Digital Signal Noise (Always present)
    // Faster, more jagged than traditional drift
    const baseT = elapsed * NOISE_TIME_MULT;
    const noisePhase = seed * NOISE_PHASE_MULT;

    // Low-frequency drift (the "signal float")
    const floatX =
      Math.sin(elapsed * FLOAT_X_TIME_MULT + noisePhase) * FLOAT_X_AMP;
    const floatY =
      Math.cos(elapsed * FLOAT_Y_TIME_MULT + noisePhase) * FLOAT_Y_AMP;

    // High-frequency digital shiver (the "static")
    const shiverX =
      (Math.sin(baseT + noisePhase) + (Math.random() - 0.5)) * SHIVER_AMP;
    const shiverY =
      (Math.cos(baseT * SHIVER_Y_PHASE_MULT + noisePhase) +
        (Math.random() - 0.5)) *
      SHIVER_AMP;

    // --- Audio Reactivity ---
    const audioGlitchFactor =
      Math.pow(levels.bass, 2) * AUDIO_GLITCH_FACTOR_MULT;
    const audioJitter = levels.treble * AUDIO_JITTER_MULT; // Slightly more sensitivity

    // 2. Multi-stage Glitch Window (Signal Corruption)
    const pattern =
      Math.sin(elapsed * PATTERN_SINE1_MULT) +
      Math.sin(elapsed * PATTERN_SINE2_MULT) +
      audioGlitchFactor;
    const isGlitching = pattern > GLITCH_THRESHOLD;

    let gdx = 0;
    let gdy = 0;
    let springScale = 1.0;
    let sizeMult = 1.0;

    if (isGlitching) {
      springScale = GLITCH_SPRING_SCALE;
      // High-intensity signal spike
      gdx =
        (Math.random() - 0.5) *
        (GLITCH_X_AMP_BASE + audioJitter * GLITCH_X_JITTER_MULT);
      gdy = (Math.random() - 0.5) * (GLITCH_Y_AMP_BASE + audioJitter);
      sizeMult = GLITCH_SIZE_BASE + Math.random() * GLITCH_SIZE_VAR; // Glitchy size flickering
    } else {
      const nearGlitch = pattern > NEAR_GLITCH_THRESHOLD;
      springScale = nearGlitch ? NEAR_GLITCH_SPRING : IDLE_SPRING;

      // Baseline audio-driven jitter
      gdx = (Math.random() - 0.5) * (audioJitter * JITTER_X_MULT);
      gdy = (Math.random() - 0.5) * (audioJitter * JITTER_Y_MULT);

      // Static "Scanline" offset - occasional horizontal shifts
      if (
        Math.sin(elapsed * SCANLINE_TIME_MULT + noisePhase) > SCANLINE_THRESHOLD
      ) {
        gdx += (Math.random() - 0.5) * SCANLINE_OFFSET_AMP;
      }

      // Subtle constant depth buzz
      sizeMult =
        1.0 +
        Math.sin(baseT * DEPTH_BUZZ_TIME_MULT + noisePhase) * DEPTH_BUZZ_AMP +
        levels.mid * DEPTH_MID_MULT;
    }

    return {
      dx: (floatX + shiverX + gdx) * scale,
      dy: (floatY + shiverY + gdy) * scale,
      springScale,
      sizeMult
    };
  }
};
