// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { CENTER_X, CENTER_Y } from './animation-constants';
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
 * a shockwave ring through the face. Motion only, colours are never changed.
 * Without music it ripples slowly.
 */

// --- Tuning Parameters ---
const MAX_RADIUS = 170;
const BARS = 90; // log-spaced bands around the halo, bass at the top
const FIRST_BIN = 100;
const BAR_GAIN_FLOOR = 0.0000001; // raw level below which a bar never auto-gains
const BAR_GAIN_RELEASE = 0.0001; // per ms
const BAR_ATTACK_MS = 1;
const BAR_RELEASE_MS = 1;
const BAR_REACH = 70;
const BAR_CURVE = 40;
const IDLE_RIPPLE_AMP = 4.5;
const IDLE_RIPPLE_SPEED = 0.0018;
const RING_SPEED = 0.42;
const RING_WIDTH = 26;
const RING_LIFE = 700;
const RING_PUSH = 16;
const SPARKLE = 2.5;
const SPRING_SCALE = 0.9;

const bars = new Float32Array(BARS);
const barPeak = new Float32Array(BARS).fill(BAR_GAIN_FLOOR);
let lastBeats = 0;
let beatTime = -1e9;
let beatStrength = 0;

/** Collapses the FFT into log-spaced, individually auto-gained bars. */
function updateBars(data: Uint8Array | undefined, dtMs: number) {
  const dt = Math.min(100, Math.max(1, dtMs || 16));
  const attack = 1 - Math.exp(-dt / BAR_ATTACK_MS);
  const release = 1 - Math.exp(-dt / BAR_RELEASE_MS);
  const hasData = !!data && data.length > 0;
  const last = hasData ? FIRST_BIN + BARS : 0;
  const ratio = hasData ? Math.pow(last / FIRST_BIN, 1 / BARS) : 1;
  let from = FIRST_BIN;
  for (let b = 0; b < BARS; b++) {
    let raw = 0;
    if (hasData) {
      const to = Math.min(
        data.length,
        Math.max(from + 1, Math.round(FIRST_BIN * Math.pow(ratio, b + 1)))
      );
      let sum = 0;
      for (let k = from; k < to; k++) sum += data[k];
      raw = sum / (to - from) / 255;
      from = to;
    }
    barPeak[b] = Math.max(
      BAR_GAIN_FLOOR,
      raw,
      barPeak[b] - dt * BAR_GAIN_RELEASE
    );
    const target = Math.min(1, raw / barPeak[b]);
    bars[b] += (target - bars[b]) * (target > bars[b] ? attack : release);
  }
}

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
    updateBars(ctx.audioData, ctx.dt);
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

    if (audioData && audioData.length > 0) {
      const f = s.shT * (BARS - 1);
      const i = Math.floor(f);
      const bar =
        bars[i] + (bars[Math.min(BARS - 1, i + 1)] - bars[i]) * (f - i);
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

    return {
      dx: (s.shNx * push + jx) * scale,
      dy: (s.shNy * push + jy) * scale,
      springScale: SPRING_SCALE
    };
  }
};
