// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { CENTER_X, CENTER_Y } from './animation-constants';
import { frac } from '../splat-scenes/utils';
import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

// --- Tuning Parameters ---
// Half the cube's edge in avatar units. The corners reach HALF * sqrt(3) from
// the centre, which must stay well inside the 320-unit avatar space.
const HALF = 74;
// Far enough that the near and far corners differ by only ~1.4x in scale; any
// closer and the cube looks warped.
const CAMERA_DISTANCE = 520;
const BASE_ROTATION_SPEED = 0.0006;
const VOLUME_ROTATION_MULT = 0.0022;
const BEAT_ROTATION_MULT = 0.004;
const TILT_BASE = 0.5;
const TILT_SWAY = 0.35;
const TILT_SPEED = 0.0003;
const BEAT_ZOOM = 90;
const TREBLE_SHIMMER = 6;
const SPRING_SCALE = 2;
const MIN_SIZE = 0.6;
const MAX_SIZE = 1.5;
// Every EDGE_EVERY-th particle sits on a cube edge instead of a face, so the
// silhouette reads as a cube rather than a cloud.
const EDGE_EVERY = 4;
const R2_A = 0.7548776662466927;
const R2_B = 0.5698402909980532;

// Frame state: the yaw is integrated, so a change in speed never makes the
// cube jump the way `elapsed * speed` would.
let angleY = 0;
let zoom = 0;
let cosX = 1;
let sinX = 0;
let cosY = 1;
let sinY = 0;

/**
 * Dimensional Portal (rotating cube)
 *
 * The particles are spread over the surface and edges of a cube that spins
 * about its vertical axis with a gently swaying tilt. Near points are drawn
 * larger, far points smaller; the cube spins faster with the music and lunges
 * at the camera on every kick.
 */
export const dimensionalPortal: SplatAnimation = {
  name: 'Dimensional Portal',

  init(particles: SplatParticle[]) {
    angleY = zoom = 0;
    particles.forEach((p, i) => {
      const a = frac((i + 1) * R2_A) * 2 - 1;
      const b = frac((i + 1) * R2_B) * 2 - 1;
      let x: number;
      let y: number;
      let z: number;
      if (i % EDGE_EVERY === 0) {
        // One of the 12 edges: the axis the edge runs along, then which of the
        // four corners of the other two axes it sits at
        const k = i / EDGE_EVERY;
        const axis = k % 3;
        const sa = k & 4 ? -1 : 1;
        const sb = k & 8 ? -1 : 1;
        const c = [sa, sb];
        c.splice(axis, 0, a);
        [x, y, z] = c;
      } else {
        const face = i % 6;
        const axis = face >> 1;
        const c = [a, b];
        c.splice(axis, 0, face & 1 ? -1 : 1);
        [x, y, z] = c;
      }
      p.animState.cx = x * HALF;
      p.animState.cy = y * HALF;
      p.animState.cz = z * HALF;
    });
  },

  beforeFrame(_particles, elapsed, ctx) {
    const { volume, beat } = ctx.audioLevels;
    angleY +=
      (BASE_ROTATION_SPEED +
        volume * VOLUME_ROTATION_MULT +
        beat * BEAT_ROTATION_MULT) *
      ctx.dt;
    const tilt = TILT_BASE + Math.sin(elapsed * TILT_SPEED) * TILT_SWAY;
    zoom += (beat * BEAT_ZOOM - zoom) * Math.min(1, ctx.dt * 0.012);
    cosX = Math.cos(tilt);
    sinX = Math.sin(tilt);
    cosY = Math.cos(angleY);
    sinY = Math.sin(angleY);
  },

  glow(_elapsed, ctx) {
    return 1 + ctx.audioLevels.beat * 0.5 + ctx.audioLevels.volume * 0.4;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { cx, cy, cz } = p.animState;
    // Treble makes the cube's skin shimmer along its normal-ish depth axis
    const shimmer =
      ctx.audioLevels.treble * TREBLE_SHIMMER * Math.sin(elapsed * 0.004 + cx);

    // Yaw about the vertical axis, then tilt about the horizontal one
    const x1 = cx * cosY + cz * sinY;
    const z1 = -cx * sinY + cz * cosY;
    const y2 = cy * cosX - z1 * sinX;
    const z2 = cy * sinX + z1 * cosX + shimmer;

    const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE + z2 - zoom);

    return {
      dx: (CENTER_X + x1 * perspective - p.ox) * ctx.scale,
      dy: (CENTER_Y + y2 * perspective - p.oy) * ctx.scale,
      springScale: SPRING_SCALE,
      sizeMult: Math.min(MAX_SIZE, Math.max(MIN_SIZE, perspective))
    };
  }
};
