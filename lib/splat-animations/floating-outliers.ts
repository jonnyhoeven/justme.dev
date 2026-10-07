// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Floating Outliers
 *
 * 50% of particles are tagged as "outliers".
 * They use a much weaker spring so they drift lazily, and receive
 * random velocity nudges driven by audio bass.
 *
 * Non-outlier particles behave normally with a subtle shiver.
 */

// --- Tuning Parameters ---
const OUTLIER_PROBABILITY = 0.5;
const WANDER_FREQ_MIN = 0.003;
const WANDER_FREQ_VAR = 0.0003;
const WANDER_AMP_MIN = 4;
const WANDER_AMP_VAR = 4;
const DEPTH_BASE_MULT = 60;
const WANDER_FREQ_DEFAULT = 0.0004;
const WANDER_AMP_DEFAULT = 6;
const BASS_WANDER_AMP_MULT = 40;
const WANDER_FREQ_Y_MULT = 0.7;
const SPRING_SCALE_BASE = 0.08;
const BASS_SPRING_MULT = 0.05;
const NUDGE_CHANCE_BASE = 0.0004;
const BASS_NUDGE_CHANCE_MULT = 0.06;
const NUDGE_AMP_BASE = 0.8;
const BASS_NUDGE_AMP_MULT = 12;
const SIZE_DIST_PHASE_TIME_MULT = 0.002;
const SIZE_BASE_OUTLIER = 1.1;
const BASS_SIZE_MULT = 0.5;
const DIST_PHASE_SIZE_MULT = 0.2;
const TREBLE_SHIVER_MULT = 5.0;
const MID_SHIVER_MULT = 2.0;
const WOBBLE_FREQ_X = 0.003;
const WOBBLE_FREQ_Y = 0.002;
const WOBBLE_BASE_AMP = 0.5;
const CORE_SIZE_BASE = 0.95;
const CORE_MID_SIZE_MULT = 0.1;
const CORE_Z_SIZE_DIVISOR = 200;
const CORE_SPRING_SCALE = 1.0;

let nudgeChance = NUDGE_CHANCE_BASE;
let nudgeAmp = NUDGE_AMP_BASE;
let audioShiver = 0;
let baseSpringScale = SPRING_SCALE_BASE;
let bassWanderAmp = 0;
let bassSize = SIZE_BASE_OUTLIER;
let coreWobbleAmp = WOBBLE_BASE_AMP;
let coreBaseSize = CORE_SIZE_BASE;

export const floatingOutliers: SplatAnimation = {
  name: 'Floating Outliers',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.animState.isOutlier = Math.random() < OUTLIER_PROBABILITY;
      p.animState.outlierPhase = Math.random() * Math.PI * 2;
      p.animState.wanderFreq =
        WANDER_FREQ_MIN + Math.random() * WANDER_FREQ_VAR;
      p.animState.wanderAmp = WANDER_AMP_MIN + Math.random() * WANDER_AMP_VAR;
      p.animState.coreWobblePhase = Math.random() * Math.PI * 2;
      p.animState.pz = (Math.random() - 0.5) * DEPTH_BASE_MULT; // Base depth
    }
  },

  beforeFrame(
    _particles: SplatParticle[],
    _elapsed: number,
    ctx: AnimationContext
  ) {
    const levels = ctx.audioLevels;
    nudgeChance = NUDGE_CHANCE_BASE + levels.bass * BASS_NUDGE_CHANCE_MULT;
    nudgeAmp = NUDGE_AMP_BASE + levels.bass * BASS_NUDGE_AMP_MULT;
    audioShiver =
      levels.treble * TREBLE_SHIVER_MULT + levels.mid * MID_SHIVER_MULT;
    baseSpringScale = Math.max(
      0.01,
      SPRING_SCALE_BASE - levels.bass * BASS_SPRING_MULT
    );
    bassWanderAmp = levels.bass * BASS_WANDER_AMP_MULT;
    bassSize = SIZE_BASE_OUTLIER + levels.bass * BASS_SIZE_MULT;
    coreWobbleAmp = WOBBLE_BASE_AMP + audioShiver;
    coreBaseSize = CORE_SIZE_BASE + levels.mid * CORE_MID_SIZE_MULT;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale } = ctx;

    // ---- Outlier behavior: Active Wandering Satellite ----
    if (p.animState.isOutlier) {
      const phase = p.animState.outlierPhase ?? 0;
      const freq = p.animState.wanderFreq ?? WANDER_FREQ_DEFAULT;
      const amp = (p.animState.wanderAmp ?? WANDER_AMP_DEFAULT) + bassWanderAmp;

      // Slow, organic wander (drift)
      const dx = Math.sin(elapsed * freq + phase) * amp;
      const dy = Math.cos(elapsed * freq * WANDER_FREQ_Y_MULT + phase) * amp;

      // Weak spring
      const springScale = baseSpringScale;

      // Bass-driven velocity pulse
      let nudgeVx = 0;
      let nudgeVy = 0;
      // High bass levels trigger more frequent nudges
      if (Math.random() < nudgeChance) {
        nudgeVx = (Math.random() - 0.5) * nudgeAmp;
        nudgeVy = (Math.random() - 0.5) * nudgeAmp;
      }

      // Outliers have more distinct size changes
      const distPhase = Math.sin(elapsed * SIZE_DIST_PHASE_TIME_MULT + phase);
      const sizeMult = bassSize + distPhase * DIST_PHASE_SIZE_MULT;

      return {
        dx: dx * scale,
        dy: dy * scale,
        springScale,
        nudgeVx,
        nudgeVy,
        sizeMult
      };
    }

    // ---- Core behavior: Subtle Shiver/Wobble driven by Treble ----
    const wobblePhase = p.animState.coreWobblePhase ?? 0;
    const wobbleX =
      Math.sin(elapsed * WOBBLE_FREQ_X + wobblePhase) * coreWobbleAmp;
    const wobbleY =
      Math.cos(elapsed * WOBBLE_FREQ_Y + wobblePhase) * coreWobbleAmp;

    // Subtle depth pulse for core particles
    const sizeMult = coreBaseSize + (p.animState.pz ?? 0) / CORE_Z_SIZE_DIVISOR;

    return {
      dx: wobbleX * scale,
      dy: wobbleY * scale,
      sizeMult,
      springScale: CORE_SPRING_SCALE
    };
  }
};
