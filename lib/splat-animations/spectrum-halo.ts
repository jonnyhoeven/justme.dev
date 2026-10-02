import { CENTER_X, CENTER_Y } from './animation-constants';
import { lerpToHighlight } from './color-utils';
import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Spectrum Halo
 *
 * The portrait becomes a radial equalizer: every particle looks up the
 * frequency bin for its angle (mirrored left/right, bass at the top) and is
 * pushed outwards by that band's energy, outer particles most. Each kick sends
 * a bright shockwave ring through the face. Without music it ripples slowly.
 */

// --- Tuning Parameters ---
const MAX_RADIUS = 170;
const SPECTRUM_SPAN = 0.32; // fraction of the FFT bins that carry the show
const BIN_CURVE = 1.7; // >1 gives bass more of the circle
const BAR_REACH = 46;
const BAR_CURVE = 1.35;
const IDLE_RIPPLE_AMP = 3.5;
const IDLE_RIPPLE_SPEED = 0.0018;
const RING_SPEED = 0.42;
const RING_WIDTH = 26;
const RING_LIFE = 700;
const RING_PUSH = 16;
const PEAK_WHITE_FROM = 0.55;
const SPARKLE = 2.5;
const SPRING_SCALE = 0.9;

let lastBeats = 0;
let beatTime = -1e9;
let beatStrength = 0;

export const spectrumHalo: SplatAnimation = {
  name: 'Spectrum Halo',

  init(particles: SplatParticle[]) {
    lastBeats = 0;
    beatTime = -1e9;
    beatStrength = 0;
    for (const p of particles) {
      const dx = p.ox - CENTER_X;
      const dy = p.oy - CENTER_Y;
      const r = Math.hypot(dx, dy) || 0.001;
      const angle = Math.atan2(dy, dx);
      p.animState.shNx = dx / r;
      p.animState.shNy = dy / r;
      p.animState.shR = r;
      p.animState.shRn = Math.min(1, r / MAX_RADIUS);
      // Bass at the top, mirrored so the halo is symmetrical
      p.animState.shT =
        Math.abs(Math.abs(angle + Math.PI / 2) - Math.PI) / Math.PI;
    }
  },

  beforeFrame(_particles, elapsed, ctx) {
    const { beats, beat } = ctx.audioLevels;
    if (beats !== lastBeats) {
      lastBeats = beats;
      beatTime = elapsed;
      beatStrength = beat;
    }
  },

  glow(_elapsed, ctx) {
    const l = ctx.audioLevels;
    return 1 + l.bass * 0.5 + l.beat * 0.4;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const s = p.animState;
    const { scale, audioData, audioLevels: levels } = ctx;

    // Idle: slow radial ripples so the portrait is never static
    let push =
      Math.sin(s.shR * 0.06 - elapsed * IDLE_RIPPLE_SPEED) *
      IDLE_RIPPLE_AMP *
      s.shRn;

    let bar = 0;
    if (audioData && audioData.length > 0) {
      const bin = Math.floor(
        Math.pow(s.shT, BIN_CURVE) * SPECTRUM_SPAN * audioData.length
      );
      bar = audioData[bin] / 255;
      push += Math.pow(bar, BAR_CURVE) * BAR_REACH * (0.3 + 0.7 * s.shRn);
    }

    // Shockwave ring from the last kick
    let ring = 0;
    const life = elapsed - beatTime;
    if (life < RING_LIFE) {
      const off = Math.abs(s.shR - life * RING_SPEED);
      if (off < RING_WIDTH) {
        ring = (1 - off / RING_WIDTH) * (1 - life / RING_LIFE) * beatStrength;
        push += ring * RING_PUSH;
      }
    }

    // Treble sparkle on the rim
    const jitter = levels.treble * SPARKLE * s.shRn;
    const jx = jitter ? (Math.random() - 0.5) * jitter : 0;
    const jy = jitter ? (Math.random() - 0.5) * jitter : 0;

    const heat = Math.max(ring, (bar - PEAK_WHITE_FROM) * 2.2);
    return {
      dx: (s.shNx * push + jx) * scale,
      dy: (s.shNy * push + jy) * scale,
      springScale: SPRING_SCALE,
      colorOverride:
        heat > 0.08 ? lerpToHighlight(p.cr, p.cg, p.cb, heat) : undefined
    };
  }
};
