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
      p.breathPhaseOffset = Math.random() * Math.PI * 2;
      p.breathSpeedMult = 0.8 + Math.random() * 0.4;
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
        const driftT = elapsed * 0.001;
        const gx = 160 + Math.sin(driftT) * 10;
        const gy = 160 + Math.sin(driftT * 2) * 10;
        frameCache.targetX = gx * scale + offsetX;
        frameCache.targetY = gy * scale + offsetY;
      }

      frameCache.magneticRange = (300 + levels.bass * 200) * scale;
      frameCache.spikeCount = 14 + Math.floor(levels.bass * 20);
      frameCache.spikeRotationSpeed = 0.0015 + levels.mid * 0.01;
      frameCache.audioSpikeBoost = levels.mid * 2.0;
      frameCache.spikeStrength = 10 + levels.bass * 20;
      frameCache.attractionBase = 20 + levels.bass * 60;
      frameCache.audioBaseline = levels.volume * 0.7;
    }

    // --- Per-Particle Calculation ---
    // Use ox/oy as stable reference points to avoid jitter/feedback
    const dxMag = p.ox * scale + offsetX - frameCache.targetX;
    const dyMag = p.oy * scale + offsetY - frameCache.targetY;
    const distMag = Math.sqrt(dxMag * dxMag + dyMag * dyMag);

    if (distMag < 0.1) return { dx: 0, dy: 0, springScale: 1.5 };

    const angle = Math.atan2(dyMag, dxMag);

    const intensity = Math.max(
      frameCache.audioBaseline,
      (frameCache.magneticRange - distMag) / frameCache.magneticRange
    );

    const spikeWave = Math.sin(
      angle * frameCache.spikeCount + elapsed * frameCache.spikeRotationSpeed
    );

    const spikeFactor =
      Math.pow(Math.abs(spikeWave), 4.0 + frameCache.audioSpikeBoost) *
      (spikeWave > 0 ? 1.8 : -0.4);

    const attraction = -intensity * frameCache.attractionBase;

    const microSpikes =
      Math.sin(angle * (45 + levels.treble * 100) + elapsed * 0.04) *
      (2.0 + levels.treble * 15) *
      intensity;

    const totalDisplacement =
      attraction +
      spikeFactor * intensity * frameCache.spikeStrength +
      microSpikes;

    const spikeDx = (dxMag / distMag) * totalDisplacement;
    const spikeDy = (dyMag / distMag) * totalDisplacement;

    const phase = p.breathPhaseOffset ?? 0;
    const shiver = Math.sin(elapsed * 0.05 + phase) * (1.5 + levels.treble * 5);
    const springScale = 1.1 + intensity * 1.5 + levels.bass;

    return {
      dx: (spikeDx + shiver * 0.5) * scale,
      dy: (spikeDy + shiver * 0.5) * scale,
      springScale
    };
  }
};
