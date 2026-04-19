import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Ferrofluid
 *
 * Simulates a magnetic fluid being pulled into sharp, jagged spikes.
 * Unlike "Flubber", this movement is snappy, sharp, and highly reactive
 * to the mouse (the primary magnet).
 *
 * Spikes form along radial "fingers" pointing toward the magnetic source.
 */

// --- Tuning Parameters ---
const IDLE_DRIFT_SPEED = 0.001;
const IDLE_CENTER_COORD = 160;
const IDLE_DRIFT_AMP = 10;
const BASE_MAGNETIC_RANGE = 300;
const BASS_MAGNETIC_RANGE_MULT = 200;
const BASE_SPIKE_COUNT = 10;
const BASS_SPIKE_COUNT_MULT = 10;
const BASE_SPIKE_ROTATION = 0.002;
const MID_SPIKE_ROTATION_MULT = 0.04;
const MID_AUDIO_SPIKE_BOOST = 1.5;
const BASE_SPIKE_STRENGTH = 15;
const BASS_SPIKE_STRENGTH_MULT = 20;
const BASE_ATTRACTION = 10;
const BASS_ATTRACTION_MULT = 40;
const VOLUME_BASELINE_MULT = 0.7;
const MIN_DIST_MAG = 0.001;
const IDLE_SPRING_SCALE = 1.5;
const SPIKE_WAVE_POWER = 4.0;
const SPIKE_FACTOR_POS = 1.8;
const SPIKE_FACTOR_NEG = -0.2;
const MICRO_SPIKE_BASE_FREQ = 300;
const TREBLE_MICRO_FREQ_MULT = 10;
const MICRO_SPIKE_TIME_MULT = 0.04;
const MICRO_SPIKE_BASE_AMP = 1.5;
const TREBLE_MICRO_AMP_MULT = 15;
const SHIVER_TIME_MULT = 0.1;
const BASE_SHIVER_AMP = 1.5;
const TREBLE_SHIVER_AMP_MULT = 5;
const BASE_SPRING_SCALE = 1.1;
const INTENSITY_SPRING_MULT = 1.2;
/**
 * Cache for frame-global calculations to avoid redundant work in the particle loop.
 */
const frameCache = {
  lastElapsed: -1,
  targetX: 0,
  targetY: 0,
  magneticRange: 0,
  spikeCount: 0,
  spikeRotationSpeed: 0,
  audioSpikeBoost: 0,
  spikeStrength: 0,
  attractionBase: 0,
  audioBaseline: 0
};

export const ferrofluid: SplatAnimation = {
  name: 'Ferrofluid',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.animState.breathPhaseOffset = Math.random() * Math.PI * 2;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale, offsetX, offsetY } = ctx;
    const levels = ctx.audioLevels;

    // --- Frame-level Cache Update ---
    if (frameCache.lastElapsed !== elapsed) {
      frameCache.lastElapsed = elapsed;

      const isMousePresent = ctx.mouseX > 0 && ctx.mouseY > 0;
      if (isMousePresent) {
        frameCache.targetX = ctx.mouseX;
        frameCache.targetY = ctx.mouseY;
      } else {
        const driftT = elapsed * IDLE_DRIFT_SPEED;
        const gx = IDLE_CENTER_COORD + Math.sin(driftT) * IDLE_DRIFT_AMP;
        const gy = IDLE_CENTER_COORD + Math.sin(driftT * 2) * IDLE_DRIFT_AMP;
        frameCache.targetX = gx * scale + offsetX;
        frameCache.targetY = gy * scale + offsetY;
      }

      frameCache.magneticRange =
        (BASE_MAGNETIC_RANGE + levels.bass * BASS_MAGNETIC_RANGE_MULT) * scale;
      frameCache.spikeCount =
        BASE_SPIKE_COUNT + Math.floor(levels.bass * BASS_SPIKE_COUNT_MULT);
      frameCache.spikeRotationSpeed =
        BASE_SPIKE_ROTATION + levels.mid * MID_SPIKE_ROTATION_MULT;
      frameCache.audioSpikeBoost = levels.mid * MID_AUDIO_SPIKE_BOOST;
      frameCache.spikeStrength =
        BASE_SPIKE_STRENGTH + levels.bass * BASS_SPIKE_STRENGTH_MULT;
      frameCache.attractionBase =
        BASE_ATTRACTION + levels.bass * BASS_ATTRACTION_MULT;
      frameCache.audioBaseline = levels.volume * VOLUME_BASELINE_MULT;
    }

    // --- Per-Particle Calculation ---
    // Use ox/oy as stable reference points to avoid jitter/feedback
    const dxMag = p.ox * scale + offsetX - frameCache.targetX;
    const dyMag = p.oy * scale + offsetY - frameCache.targetY;
    const distMag = Math.sqrt(dxMag * dxMag + dyMag * dyMag);

    if (distMag < MIN_DIST_MAG)
      return { dx: 0, dy: 0, springScale: IDLE_SPRING_SCALE };

    const angle = Math.atan2(dyMag, dxMag);

    const intensity = Math.max(
      frameCache.audioBaseline,
      (frameCache.magneticRange - distMag) / frameCache.magneticRange
    );

    const spikeWave = Math.sin(
      angle * frameCache.spikeCount + elapsed * frameCache.spikeRotationSpeed
    );

    const spikeFactor =
      Math.pow(
        Math.abs(spikeWave),
        SPIKE_WAVE_POWER + frameCache.audioSpikeBoost
      ) * (spikeWave > 0 ? SPIKE_FACTOR_POS : SPIKE_FACTOR_NEG);

    const attraction = -intensity * frameCache.attractionBase;

    const microSpikes =
      Math.sin(
        angle *
          (MICRO_SPIKE_BASE_FREQ + levels.treble * TREBLE_MICRO_FREQ_MULT) +
          elapsed * MICRO_SPIKE_TIME_MULT
      ) *
      (MICRO_SPIKE_BASE_AMP + levels.treble * TREBLE_MICRO_AMP_MULT) *
      intensity;

    const totalDisplacement =
      attraction +
      spikeFactor * intensity * frameCache.spikeStrength +
      microSpikes;

    const spikeDx = (dxMag / distMag) * totalDisplacement;
    const spikeDy = (dyMag / distMag) * totalDisplacement;

    const phase = p.animState.breathPhaseOffset ?? 0;
    const shiver =
      Math.sin(elapsed * SHIVER_TIME_MULT + phase) *
      (BASE_SHIVER_AMP + levels.treble * TREBLE_SHIVER_AMP_MULT);
    const springScale =
      BASE_SPRING_SCALE + intensity * INTENSITY_SPRING_MULT + levels.bass;

    return {
      dx: (spikeDx + shiver * 0.5) * scale,
      dy: (spikeDy + shiver * 0.5) * scale,
      springScale
    };
  }
};
