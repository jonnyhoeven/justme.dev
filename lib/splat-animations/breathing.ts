import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Breathing / Pulse
 *
 * The entire splat cluster gently expands and contracts radially,
 * like it's breathing. Very slow (~10s cycle), very subtle (±2px).
 */

// --- Tuning Parameters ---
const CENTER_X = 160;
const CENTER_Y = 160;
const BREATH_SPEED_BASE = 0.8;
const BREATH_SPEED_VAR = 0.4;
const BREATH_AMP_BASE = 0.5;
const BREATH_AMP_VAR = 1.5;
const AUDIO_BOOST_MULT = 2.5;
const CYCLE_TIME_MULT = 0.0008;
const CYCLE_AMP_BASE = 12;
const CYCLE_AUDIO_AMP_MULT = 15;

export const breathing: SplatAnimation = {
  name: 'Breathing',

  init(particles: SplatParticle[]) {
    const cx = CENTER_X;
    const cy = CENTER_Y;
    for (const p of particles) {
      // Individualize the pulse
      p.animState.breathPhaseOffset = Math.random() * Math.PI * 2;
      p.animState.breathSpeedMult =
        BREATH_SPEED_BASE + Math.random() * BREATH_SPEED_VAR; // 80% to 120% speed
      p.animState.breathAmpMult =
        BREATH_AMP_BASE + Math.random() * BREATH_AMP_VAR; // 50% to 200% amplitude
      p.animState.radialAngle = Math.atan2(p.oy - cy, p.ox - cx);
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.animState.breathPhaseOffset ?? 0;
    const speed = p.animState.breathSpeedMult ?? 1;
    const amp = p.animState.breathAmpMult ?? 1;

    // --- Audio Reactivity ---
    const { scale } = ctx;
    const levels = ctx.audioLevels;
    const audioBoost = levels.bass * AUDIO_BOOST_MULT; // Bass drives extra expand/contract

    // Base pulse (~8s) + individual variations + audio reaction
    const breathCycle =
      Math.sin(elapsed * CYCLE_TIME_MULT * speed + phase) *
      (CYCLE_AMP_BASE * amp + audioBoost * CYCLE_AUDIO_AMP_MULT);

    const angle = p.animState.radialAngle ?? 0;

    return {
      dx: Math.cos(angle) * breathCycle * scale,
      dy: Math.sin(angle) * breathCycle * scale
    };
  }
};
