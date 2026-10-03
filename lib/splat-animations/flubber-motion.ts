import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Flubber Motion
 *
 * A tribute to the original Xbox "X-Blob" boot animation.
 * Instead of simple breathing, it uses multiple layers of asynchronous
 * noise to create "lumps" of motion that shift through the mass.
 *
 * It stays viscous and organic, feeling like a heavy fluid state.
 */

// --- Tuning Parameters ---
const PHASE_OFFSET_MULT = 0.5;
const AMP_MULT_BASE = 0.5;
const AMP_MULT_VAR = 1.0;
const AUDIO_BOOST_MULT = 2.0;
const LAYER1_TIME_MULT = 0.0004;
const LAYER1_AMP_BASE = 8;
const LAYER1_BASS_MULT = 20;
const CHURN_SPEED_BASE = 0.002;
const CHURN_MID_MULT = 0.008;
const LUMPY_SPACE_MULT_X = 0.04;
const LUMPY_SPACE_MULT_Y = 0.04;
const LAYER2_AMP_BASE = 4;
const LAYER2_MID_MULT = 8;
const TREBLE_ENERGY_MULT = 4.0;
const LAYER3_TIME_MULT_X = 0.04;
const LAYER3_TIME_MULT_Y = 0.035;
const LAYER3_AMP_BASE = 0.8;
const LAYER1_WEIGHT = 0.5;
const VELOCITY_DIVISOR = 8;
const SPRING_SCALE_BASE = 0.8;
const SPRING_VELOCITY_MULT = 0.4;
const SPRING_AUDIO_MULT = 0.5;

let churnSpeed = CHURN_SPEED_BASE;
let layer1Amp = LAYER1_AMP_BASE;
let layer2Amp = LAYER2_AMP_BASE;
let layer3Amp = LAYER3_AMP_BASE;
let audioBoost = 0;

export const flubberMotion: SplatAnimation = {
  name: 'Flubber Motion',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individual phase offsets to break up uniformity
      p.animState.breathPhaseOffset =
        Math.random() * Math.PI * PHASE_OFFSET_MULT;
      // Each particle gets a "sensitivity" to the global noise
      p.animState.breathAmpMult = AMP_MULT_BASE + Math.random() * AMP_MULT_VAR;
    }
  },

  beforeFrame(
    _particles: SplatParticle[],
    _elapsed: number,
    ctx: AnimationContext
  ) {
    const levels = ctx.audioLevels;
    churnSpeed = CHURN_SPEED_BASE + levels.mid * CHURN_MID_MULT;
    layer1Amp = LAYER1_AMP_BASE + levels.bass * LAYER1_BASS_MULT;
    layer2Amp = LAYER2_AMP_BASE + levels.mid * LAYER2_MID_MULT;
    layer3Amp = LAYER3_AMP_BASE + levels.treble * TREBLE_ENERGY_MULT;
    audioBoost = levels.volume * AUDIO_BOOST_MULT;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.animState.breathPhaseOffset ?? 0;
    const ampMult = p.animState.breathAmpMult ?? 1;
    const { scale } = ctx;

    // --- The "Lumpy" Logic ---
    // We use 3 layers of motion moving at different speeds (flubber-style)
    // Layer 1: Large slow pulse (The "Breath") - Bass drives extra expand
    const layer1 =
      Math.sin(elapsed * LAYER1_TIME_MULT + phase) * layer1Amp * ampMult;

    // Layer 2: Medium lumpy swell (The "Churn")
    // Mid/Bass frequencies increase the churn speed and amplitude
    const lumpyPhaseX = elapsed * churnSpeed + p.ox * LUMPY_SPACE_MULT_X;
    const lumpyPhaseY = elapsed * churnSpeed + p.oy * LUMPY_SPACE_MULT_Y;
    const layer2X = Math.sin(lumpyPhaseX) * layer2Amp;
    const layer2Y = Math.cos(lumpyPhaseY) * layer2Amp;

    // Layer 3: Toxic shiver (The "Energy")
    // Ultra-fast vibrations driven by Treble frequencies
    const layer3X = Math.sin(elapsed * LAYER3_TIME_MULT_X + phase) * layer3Amp;
    const layer3Y = Math.cos(elapsed * LAYER3_TIME_MULT_Y + phase) * layer3Amp;

    // Combine for final displacement
    const dx = (layer1 * LAYER1_WEIGHT + layer2X + layer3X) * scale;
    const dy = (layer1 * LAYER1_WEIGHT + layer2Y + layer3Y) * scale;

    // Viscosity control: spring gets "tighter" with audio energy
    const velocityFactor = Math.abs(layer2X + layer2Y) / VELOCITY_DIVISOR;
    const springScale =
      SPRING_SCALE_BASE +
      velocityFactor * SPRING_VELOCITY_MULT +
      audioBoost * SPRING_AUDIO_MULT;

    return {
      dx,
      dy,
      springScale
    };
  }
};
