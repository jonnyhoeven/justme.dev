import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

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
      p.pz = (Math.random() - 0.5) * 200;
      p.lastElapsed = 0;
      p.smoothedVolume = 0;
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
    p.lastElapsed = elapsed;
    p.smoothedVolume = (p.smoothedVolume ?? 0) * 0.95 + levels.volume * 0.05;
    const sVol = p.smoothedVolume;

    // --- 3D Parameters ---
    // Focal length for perspective projection
    const focalLength = 300;

    // Rotation angles based on time and volume
    const rotationSpeed = 0.0005 + sVol * 0.01;
    const angleX = elapsed * rotationSpeed * 0.7;
    const angleY = elapsed * rotationSpeed * 1.1;
    const angleZ = elapsed * rotationSpeed * 0.3;

    // --- 3D Coordinates (Centered at 160, 160) ---
    // Use original position (ox, oy) as X and Y
    let x = p.ox - 160;
    let y = p.oy - 160;
    let z = p.pz ?? 0;

    // Add depth jitter from treble ("sploids moving in depth")
    z += levels.treble * 40 * Math.sin(elapsed * 0.01 + (p.pz ?? 0));

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
    const zOffset = 250;
    const perspective = focalLength / (focalLength + z + zOffset);

    const projX = 160 + x * perspective;
    const projY = 160 + y * perspective;

    // --- Depth-based Coloring ---
    // Darken particles that are further away (simulating depth/atmospheric fog)
    // p.color is "r, g, b". We scale these values.
    let colorOverride: string | undefined = undefined;
    if (z + zOffset > 0) {
      const brightness = Math.max(0.3, Math.min(1.2, 1 - z / 200));
      const r = p.cr ?? 0;
      const g = p.cg ?? 0;
      const b = p.cb ?? 0;
      colorOverride = `${Math.floor(r * brightness)}, ${Math.floor(g * brightness)}, ${Math.floor(b * brightness)}`;
    }

    return {
      dx: (projX - p.ox) * scale,
      dy: (projY - p.oy) * scale,
      colorOverride,
      springScale: 0.8 // Slightly looser spring for 3D fluid feel
    };
  }
};
