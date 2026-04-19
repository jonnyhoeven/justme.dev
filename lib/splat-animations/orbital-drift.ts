import {
  VOLUME_SMOOTHING,
  SIZE_OSCILLATION_AMP,
  DEFAULT_CENTER_X,
  DEFAULT_CENTER_Y
} from './animation-constants';
import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { smoothValue } from './audio-utils';

// --- Tuning Parameters ---
const CENTER_VARIANCE = 40;
const BASE_ORBIT_SPEED_MIN = 0.00003;
const BASE_ORBIT_SPEED_VARIANCE = 0.00004;
const OSCILLATION_BASE = 0.0001;
const OSCILLATION_BASS_MULT = 0.00005;
const MUSIC_SPEED_BOOST_MULT = 0.005;
const VOLUME_ZOOM_FACTOR = 0.15;
const VOLUME_SIZE_FACTOR = 0.02;
/**
 * Slow Orbital Drift
 *
 * Particles imperceptibly orbit around the image center,
 * giving the portrait a subtle rotating shimmer.
 * Full revolution takes ~2 minutes — almost invisible.
 */
export const orbitalDrift: SplatAnimation = {
  name: 'Orbital Drift',

  init(particles: SplatParticle[]) {
    const globalDir = Math.random() > 0.5 ? 1 : -1;
    for (const p of particles) {
      // Each particle gets a unique center point ±20px from true 160, 160
      p.animState.orbitCx =
        DEFAULT_CENTER_X + (Math.random() - 0.5) * CENTER_VARIANCE;
      p.animState.orbitCy =
        DEFAULT_CENTER_Y + (Math.random() - 0.5) * CENTER_VARIANCE;
      // Random direction (global for this session) + variation
      p.animState.orbitSpeed =
        globalDir *
        (BASE_ORBIT_SPEED_MIN + Math.random() * BASE_ORBIT_SPEED_VARIANCE);
      p.animState.orbitAngle = Math.atan2(
        p.oy - p.animState.orbitCy,
        p.ox - p.animState.orbitCx
      );
      p.animState.orbitRadius = Math.sqrt(
        (p.ox - p.animState.orbitCx) ** 2 + (p.oy - p.animState.orbitCy) ** 2
      );
      p.animState.lastElapsed = 0;
      p.animState.smoothedVolume = 0;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const cx = p.animState.orbitCx ?? DEFAULT_CENTER_X;
    const cy = p.animState.orbitCy ?? DEFAULT_CENTER_Y;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // --- Smoothing & Reactive Timing ---
    const dt = elapsed - (p.animState.lastElapsed ?? 0);
    p.animState.lastElapsed = elapsed;

    // Smoothing factor for volume
    p.animState.smoothedVolume = smoothValue(
      p.animState.smoothedVolume ?? 0,
      levels.volume,
      VOLUME_SMOOTHING
    );
    const sVol = p.animState.smoothedVolume;

    // --- Dynamic Direction & Speed ---
    const oscillationSpeed =
      OSCILLATION_BASE + levels.bass * OSCILLATION_BASS_MULT;
    const directionMult = Math.cos(elapsed * oscillationSpeed);

    const baseSpeed = p.animState.orbitSpeed ?? BASE_ORBIT_SPEED_MIN;
    const musicSpeedBoost = sVol * MUSIC_SPEED_BOOST_MULT;
    const currentSpeed = (baseSpeed + musicSpeedBoost) * directionMult;

    // Increment angle based on delta time
    p.animState.orbitAngle = (p.animState.orbitAngle ?? 0) + dt * currentSpeed;

    // --- Radial Zoom Out ---
    const dist = p.animState.orbitRadius ?? 0;
    const zoomFactor = 1.0 + sVol * VOLUME_ZOOM_FACTOR;
    const currentDist = dist * zoomFactor;

    const newOx = cx + Math.cos(p.animState.orbitAngle) * currentDist;
    const newOy = cy + Math.sin(p.animState.orbitAngle) * currentDist;

    // Depth effect: further particles (smaller orbits) are slightly different size
    const sizeMult =
      1.0 +
      sVol * VOLUME_SIZE_FACTOR +
      Math.sin(elapsed * 0.001 + p.ox * 0.01) * SIZE_OSCILLATION_AMP;

    return {
      dx: (newOx - p.ox) * scale,
      dy: (newOy - p.oy) * scale,
      sizeMult: sizeMult
    };
  }
};
