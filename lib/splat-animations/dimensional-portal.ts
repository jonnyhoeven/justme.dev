import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { smoothValue } from './audio-utils';

// --- Tuning Parameters ---
const DEPTH_RANGE_Z = 200;
const VOLUME_SMOOTHING = 0.05;
const FOCAL_LENGTH = 300;
const BASE_ROTATION_SPEED = 0.0005;
const VOLUME_ROTATION_MULT = 0.01;
const ANGLE_VELOCITY_X = 0.7;
const ANGLE_VELOCITY_Y = 1.1;
const ANGLE_VELOCITY_Z = 0.3;
const CENTER_X = 160;
const CENTER_Y = 160;
const TREBLE_DEPTH_AMP = 40;
const TREBLE_DEPTH_SPEED = 0.01;
const Z_OFFSET = 250;
const BRIGHTNESS_MIN = 0.3;
const BRIGHTNESS_MAX = 1.2;
const BRIGHTNESS_FADE_DIST = 200;
const LOOSE_SPRING_SCALE = 0.8;

/**
 * Dimensional Portal (3D Projection)
 *
 * Particles are projected into a 3D point cloud cube that rotates
 * and reacts to music. "Sploids" move in depth based on treble.
 */
export const dimensionalPortal: SplatAnimation = {
  name: 'Dimensional Portal',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Assign a random depth (Z) between -100 and 100
      p.animState.pz = (Math.random() - 0.5) * DEPTH_RANGE_Z;
      p.animState.smoothedVolume = 0;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // --- Smoothing ---
    p.animState.smoothedVolume = smoothValue(
      p.animState.smoothedVolume ?? 0,
      levels.volume,
      VOLUME_SMOOTHING
    );
    const sVol = p.animState.smoothedVolume;

    // --- 3D Parameters ---
    // Focal length for perspective projection
    const focalLength = FOCAL_LENGTH;

    // Rotation angles based on time and volume
    const rotationSpeed = BASE_ROTATION_SPEED + sVol * VOLUME_ROTATION_MULT;
    const angleX = elapsed * rotationSpeed * ANGLE_VELOCITY_X;
    const angleY = elapsed * rotationSpeed * ANGLE_VELOCITY_Y;
    const angleZ = elapsed * rotationSpeed * ANGLE_VELOCITY_Z;

    // --- 3D Coordinates (Centered at 160, 160) ---
    // Use original position (ox, oy) as X and Y
    let x = p.ox - CENTER_X;
    let y = p.oy - CENTER_Y;
    let z = p.animState.pz ?? 0;

    // Add depth jitter from treble ("sploids moving in depth")
    z +=
      levels.treble *
      TREBLE_DEPTH_AMP *
      Math.sin(elapsed * TREBLE_DEPTH_SPEED + (p.animState.pz ?? 0));

    // --- 3D Rotation ---
    // Rotate around X
    let tempY = y * Math.cos(angleX) - z * Math.sin(angleX);
    let tempZ = y * Math.sin(angleX) + z * Math.cos(angleX);
    y = tempY;
    z = tempZ;

    // Rotate around Y
    let tempX = x * Math.cos(angleY) + z * Math.sin(angleY);
    tempZ = -x * Math.sin(angleY) + z * Math.cos(angleY);
    x = tempX;
    z = tempZ;

    // Rotate around Z
    tempX = x * Math.cos(angleZ) - y * Math.sin(angleZ);
    tempY = x * Math.sin(angleZ) + y * Math.cos(angleZ);
    x = tempX;
    y = tempY;

    // --- Projection ---
    // Perspective math: x' = x * focal / (focal + z)
    // We offset the whole scene away from the camera by 200 units
    const zOffset = Z_OFFSET;
    const perspective = focalLength / (focalLength + z + zOffset);

    const projX = CENTER_X + x * perspective;
    const projY = CENTER_Y + y * perspective;

    // --- Depth-based Coloring ---
    // Darken particles that are further away (simulating depth/atmospheric fog)
    // p.color is "r, g, b". We scale these values.
    let colorOverride: string | undefined = undefined;
    if (z + zOffset > 0) {
      const brightness = Math.max(
        BRIGHTNESS_MIN,
        Math.min(BRIGHTNESS_MAX, 1 - z / BRIGHTNESS_FADE_DIST)
      );
      const { cr: r, cg: g, cb: b } = p;
      colorOverride = `${Math.floor(r * brightness) & 0xf8}, ${Math.floor(g * brightness) & 0xf8}, ${Math.floor(b * brightness) & 0xf8}`;
    }

    return {
      dx: (projX - p.ox) * scale,
      dy: (projY - p.oy) * scale,
      colorOverride,
      springScale: LOOSE_SPRING_SCALE // Slightly looser spring for 3D fluid feel
    };
  }
};
