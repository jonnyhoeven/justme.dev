import type { SplatScene, SplatParticle } from '../splat-animations/types';

/**
 * Starfield: every particle is a star flying out of the middle of the area
 * towards the viewer, growing as it gets close.
 */

const SPEED = 0.00007;
const FAR_RADIUS = 0.04;
const NEAR_RADIUS = 1.7;
// FAR_RADIUS + NEAR_RADIUS is the spread at depth 1; MIN_EDGE times that must
// clear the area edge with margin for the star's size and the feathered mask
const MIN_EDGE = 0.7;

let cx = 0;
let cy = 0;
let halfW = 1;
let halfH = 1;
let warp = 0;

export const starfield: SplatScene = {
  name: 'Starfield',
  alpha: 1,

  glowRect(ctx, out) {
    // The glow becomes the Milky Way seen edge-on: a band through the middle
    out.x = ctx.areaX + ctx.areaW / 2;
    out.y = ctx.areaY + ctx.areaH / 2;
    out.w = ctx.areaW * 1.3;
    out.h = ctx.areaH * 0.14;
  },

  init(particles: SplatParticle[]) {
    warp = 0;
    for (const p of particles) {
      // Square-normalised direction with its larger axis in [MIN_EDGE, 1]: at
      // full depth every star is past the area edge, so the respawn is hidden
      const dx = Math.random() * 2 - 1;
      const dy = Math.random() * 2 - 1;
      const edge =
        (MIN_EDGE + Math.random() * (1 - MIN_EDGE)) /
        (Math.max(Math.abs(dx), Math.abs(dy)) || 1);
      p.animState.star = {
        x: dx * edge,
        y: dy * edge,
        seed: Math.random(),
        lastDepth: 0
      };
    }
  },

  beforeFrame(_elapsed, ctx) {
    // Integrated so speed changes never make the stars jump; bass and kicks hit the throttle
    const { bass, beat } = ctx.audioLevels;
    warp += ctx.dt * SPEED * (1 + bass * 4 + beat * 9);
    cx = ctx.areaX + ctx.areaW / 2;
    cy = ctx.areaY + ctx.areaH / 2;
    halfW = ctx.areaW / 2;
    halfH = ctx.areaH / 2;
  },

  target(p, _i, _elapsed, _ctx, out) {
    const s = p.animState.star;
    const t = s.seed + warp;
    const depth = t - Math.floor(t); // 0 = far, 1 = at the camera
    const spread = FAR_RADIUS + depth * depth * NEAR_RADIUS;

    out.x = cx + s.x * halfW * spread;
    out.y = cy + s.y * halfH * spread;
    out.sizeMult = 0.15 + depth * 0.75;

    // Respawn at the middle instead of flying back across the canvas
    if (depth < s.lastDepth) {
      p.x = out.x;
      p.y = out.y;
      p.vx = p.vy = 0;
    }
    s.lastDepth = depth;
  }
};
