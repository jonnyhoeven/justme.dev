import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Ambient Wind Waves
 *
 * A slow sine wave travels horizontally across the particles,
 * making the portrait gently ripple like a reflection on water.
 * Gentle ripple — period ~8s, amplitude ±3.5px.
 */

// --- Tuning Parameters ---
const AMP_MULT_BASE = 0.8;
const AMP_MULT_VAR = 0.4;
const AMP_BASE = 6.0;
const BASS_AMP_MULT = 30.0;
const SPATIAL_FREQ = 0.05;
const SPEED_BASE = 0.0015;
const MID_SPEED_MULT = 0.005;
const WIND_FREQ_MULT = 0.5;
const WIND_SPEED_MULT = 0.8;
const WIND_AMP_MULT = 0.8;
const TURBULENCE_BASE = 1.5;
const TREBLE_TURBULENCE_MULT = 15.0;
const INTERFERENCE_SPACE_MULT = 0.1;
const INTERFERENCE_TIME_MULT = 0.005;
const INTERFERENCE_Y_WEIGHT = 0.5;

export const windWaves: SplatAnimation = {
  name: 'Wind Waves',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individualize the wave phase and amplitude
      p.animState.wavePhaseOffset = Math.random() * Math.PI * 2;
      // 80% to 120% variation in how much they're affected by the wind
      p.animState.breathAmpMult = AMP_MULT_BASE + Math.random() * AMP_MULT_VAR;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.animState.wavePhaseOffset ?? 0;
    const ampMult = p.animState.breathAmpMult ?? 1;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    const amplitude = (AMP_BASE + levels.bass * BASS_AMP_MULT) * ampMult;
    const frequency = SPATIAL_FREQ; // spatial frequency
    // Speed increases with audio mid-range
    const speed = SPEED_BASE + levels.mid * MID_SPEED_MULT;

    // Primary ripple wave
    const waveY =
      Math.sin(p.ox * frequency + elapsed * speed + phase) * amplitude;

    // Pronounced wind gust on X
    const windGust =
      Math.sin(
        p.ox * frequency * WIND_FREQ_MULT +
          elapsed * speed * WIND_SPEED_MULT +
          phase
      ) *
      (amplitude * WIND_AMP_MULT);

    // High-frequency interference layer for turbulence (driven by treble)
    const turbulence = TURBULENCE_BASE + levels.treble * TREBLE_TURBULENCE_MULT;
    const interference =
      Math.sin(
        p.oy * INTERFERENCE_SPACE_MULT + elapsed * INTERFERENCE_TIME_MULT
      ) * turbulence;

    const waveX = windGust + interference;

    return {
      dx: waveX * scale,
      dy: (waveY + interference * INTERFERENCE_Y_WEIGHT) * scale
    };
  }
};
