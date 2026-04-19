import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { lerpToWhite } from './color-utils';

/**
 * Entangled Waveform / VU Meter
 *
 * Particles form a mirrored VU meter.
 * Left = Bass, Right = Treble.
 * 'Entanglement' occurs on peaks where top and bottom particles swap or sync.
 */

// --- Tuning Parameters ---
const CANVAS_WIDTH = 320;
const BIN_USAGE_RATIO = 0.6;
const TIME_MULT = 0.002;
const CENTER_Y = 160;
const MIN_CENTER_MULT = 0.15;
const IDLE_WAVE_TIME_MULT = 0.5;
const IDLE_WAVE_SPACE_MULT = 0.04;
const IDLE_WAVE_AMP = 2.5;
const BASE_WAVE_AMP_MIN = 15;
const BASS_WAVE_AMP_MULT = 50;
const PEAK_THRESHOLD = 0.35;
const JITTER_AMP_MULT = 15;
const OSCILLATE_TIME_MULT = 20;
const OSCILLATE_AMP_MULT = 25;
const DRIFT_X_SPACE_MULT = 0.05;
const DRIFT_X_AMP = 4;
const COLOR_LERP_MULT = 0.5;
const SIZE_MULT_BASE = 0.8;
const SIZE_MULT_AMP = 1.0;
const SPRING_SCALE_BASE = 1.0;
const SPRING_SCALE_AMP_MULT = 0.5;

export const entangledWaveform: SplatAnimation = {
  name: 'Entangled Waveform',

  init(particles: SplatParticle[]) {
    // Partition particles into two horizontal layers
    // We'll use p.oy to determine if they are 'top' or 'bottom'
    // and sort them roughly by ox to assign them to audio bins.
    particles.forEach((p, i) => {
      // Use index parity as a stable way to split them 50/50
      // while preserving their original ox/oy for the base layout.
      p.animState.isTop = i % 2 === 0; // true = Top, false = Bottom
    });
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { audioData, scale, audioLevels: levels } = ctx;
    const numBins = audioData ? audioData.length : 0;

    // Map ox (0-320) to frequency bin
    // We use a slight logarithmic-like focus on the lower/mid ranges where most energy is.
    const normalizedX = p.ox / CANVAS_WIDTH;
    const binIdx = Math.floor(normalizedX * (numBins * BIN_USAGE_RATIO)); // Focus on first 60% of bins
    const amplitude = audioData ? (audioData[binIdx] || 0) / 255 : 0;

    const isTop = p.animState.isTop;
    const time = elapsed * TIME_MULT;

    // --- Dynamic Amplitude Mapping ---
    // Particles near the center line (160) have full movement.
    // Movement scales down linearly as we approach top/bottom edges to prevent overflow.
    const distFromCenter = Math.abs(p.oy - CENTER_Y);
    const centerMult = Math.max(
      MIN_CENTER_MULT,
      1.0 - distFromCenter / CENTER_Y
    );

    // Baseline "Idle" Wave - ensures motion without music
    const idleWave =
      Math.sin(time * IDLE_WAVE_TIME_MULT + p.ox * IDLE_WAVE_SPACE_MULT) *
      IDLE_WAVE_AMP;

    // Base waveform movement
    // Reduced overall waveAmp to keep it within canvas, scaled by centerMult
    const waveAmp =
      (BASE_WAVE_AMP_MIN + levels.bass * BASS_WAVE_AMP_MULT) * centerMult;
    const baseDy = (amplitude * waveAmp + idleWave) * (isTop ? -1 : 1);

    // Entanglement: On high amplitude, they 'vibrate' towards each other
    let qdy = 0;
    let qdx = 0;
    const peakThreshold = PEAK_THRESHOLD;
    const entanglementStrength = Math.max(
      0,
      (amplitude - peakThreshold) / (1 - peakThreshold)
    );

    if (entanglementStrength > 0) {
      // High-frequency jitter
      qdx = (Math.random() - 0.5) * entanglementStrength * JITTER_AMP_MULT;
      // Oscillate between their mirrored positions
      qdy =
        Math.sin(time * OSCILLATE_TIME_MULT) *
        entanglementStrength *
        OSCILLATE_AMP_MULT;
    }

    // Gentle horizontal drift
    const driftX = Math.sin(time + p.ox * DRIFT_X_SPACE_MULT) * DRIFT_X_AMP;

    const colorOverride = lerpToWhite(
      p.cr,
      p.cg,
      p.cb,
      amplitude * COLOR_LERP_MULT
    );

    return {
      dx: (driftX + qdx) * scale,
      dy: (baseDy + qdy) * scale,
      sizeMult: SIZE_MULT_BASE + amplitude * SIZE_MULT_AMP, // Pulsing size with audio
      springScale: SPRING_SCALE_BASE - amplitude * SPRING_SCALE_AMP_MULT, // Looser as they get louder
      colorOverride
    };
  }
};
