import { CENTER_X, CENTER_Y } from './animation-constants';
import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

// --- Tuning Parameters ---
const DEPTH_RANGE_Z = 200;
const FOCAL_LENGTH = 400;
const BASE_ROTATION_SPEED = 0.0006;
const VOLUME_ROTATION_MULT = 0.0022;
const BEAT_ROTATION_MULT = 0.004;
const TREBLE_DEPTH_AMP = 50;
const TREBLE_DEPTH_SPEED = 0.001;
const Z_OFFSET = 150;
const BEAT_ZOOM = 90;
const LOOSE_SPRING_SCALE = 0.5;
const MIN_SIZE = 0.5;
const MAX_SIZE = 1.7;

// Frame state: angles are integrated, so a change in speed never makes the
// cloud jump the way `elapsed * speed` would.
let angleX = 0;
let angleY = 0;
let angleZ = 0;
let zoom = 0;
let cosX = 1;
let sinX = 0;
let cosY = 1;
let sinY = 0;
let cosZ = 1;
let sinZ = 0;

/**
 * Dimensional Portal (3D Projection)
 *
 * Particles are projected into a rotating 3D point cloud. Near points are
 * drawn larger, far points smaller; the cloud spins faster with the music and
 * lunges at the camera on every kick.
 */
export const dimensionalPortal: SplatAnimation = {
  name: 'Dimensional Portal',

  init(particles: SplatParticle[]) {
    angleX = angleY = angleZ = zoom = 0;
    for (const p of particles) {
      p.animState.pz = (Math.random() - 0.5) * DEPTH_RANGE_Z;
    }
  },

  beforeFrame(_particles, _elapsed, ctx) {
    const { volume, beat } = ctx.audioLevels;
    const speed =
      (BASE_ROTATION_SPEED +
        volume * VOLUME_ROTATION_MULT +
        beat * BEAT_ROTATION_MULT) *
      ctx.dt;
    angleX += speed * 0.7;
    angleY += speed;
    angleZ += speed * 0.4;
    zoom += (beat * BEAT_ZOOM - zoom) * Math.min(1, ctx.dt * 0.012);
    cosX = Math.cos(angleX);
    sinX = Math.sin(angleX);
    cosY = Math.cos(angleY);
    sinY = Math.sin(angleY);
    cosZ = Math.cos(angleZ);
    sinZ = Math.sin(angleZ);
  },

  glow(_elapsed, ctx) {
    return 1 + ctx.audioLevels.beat * 0.5 + ctx.audioLevels.volume * 0.4;
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const pz: number = p.animState.pz ?? 0;
    let x = p.ox - CENTER_X;
    let y = p.oy - CENTER_Y;
    // Treble makes the points shimmer in depth
    let z =
      pz +
      ctx.audioLevels.treble *
        TREBLE_DEPTH_AMP *
        Math.sin(elapsed * TREBLE_DEPTH_SPEED + pz);

    let t = y * cosX - z * sinX;
    z = y * sinX + z * cosX;
    y = t;

    t = x * cosY + z * sinY;
    z = -x * sinY + z * cosY;
    x = t;

    t = x * cosZ - y * sinZ;
    y = x * sinZ + y * cosZ;
    x = t;

    const perspective = FOCAL_LENGTH / (FOCAL_LENGTH + z + Z_OFFSET - zoom);
    const restPerspective = FOCAL_LENGTH / (FOCAL_LENGTH + Z_OFFSET);

    return {
      dx: (CENTER_X + x * perspective - p.ox) * ctx.scale,
      dy: (CENTER_Y + y * perspective - p.oy) * ctx.scale,
      springScale: LOOSE_SPRING_SCALE,
      sizeMult: Math.min(
        MAX_SIZE,
        Math.max(MIN_SIZE, perspective / restPerspective)
      )
    };
  }
};
