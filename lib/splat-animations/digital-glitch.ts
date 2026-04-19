import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Digital Glitch
 *
 * High-intensity, jittery corruption.
 * When a glitch hits, ALL particles spike in random, jagged directions
 * like lightning and then snap back almost instantly.
 */
export const digitalGlitch: SplatAnimation = {
  name: 'Digital Glitch',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      p.glitchSeed = Math.random();
      p.glitchSensitivity = 0.8 + Math.random() * 0.5;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const seed = p.glitchSeed ?? 0.5;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // 1. Digital Signal Noise (Always present)
    // Faster, more jagged than traditional drift
    const baseT = elapsed * 0.01;
    const noisePhase = seed * 100;

    // Low-frequency drift (the "signal float")
    const floatX = Math.sin(elapsed * 0.001 + noisePhase) * 2;
    const floatY = Math.cos(elapsed * 0.0008 + noisePhase) * 2;

    // High-frequency digital shiver (the "static")
    const shiverX =
      (Math.sin(baseT + noisePhase) + (Math.random() - 0.5)) * 1.5;
    const shiverY =
      (Math.cos(baseT * 1.2 + noisePhase) + (Math.random() - 0.5)) * 1.5;

    // --- Audio Reactivity ---
    const audioGlitchFactor = Math.pow(levels.bass, 2) * 1.5;
    const audioJitter = levels.treble * 18; // Slightly more sensitivity

    // 2. Multi-stage Glitch Window (Signal Corruption)
    const pattern =
      Math.sin(elapsed * 0.004) + Math.sin(elapsed * 0.009) + audioGlitchFactor;
    const isGlitching = pattern > 1.9;

    let gdx = 0;
    let gdy = 0;
    let springScale = 1.0;
    let sizeMult = 1.0;

    if (isGlitching) {
      springScale = 0.01;
      // High-intensity signal spike
      gdx = (Math.random() - 0.5) * (45 + audioJitter * 2.5);
      gdy = (Math.random() - 0.5) * (12 + audioJitter);
      sizeMult = 0.8 + Math.random() * 0.4; // Glitchy size flickering
    } else {
      const nearGlitch = pattern > 1.4;
      springScale = nearGlitch ? 0.3 : 1.1;

      // Baseline audio-driven jitter
      gdx = (Math.random() - 0.5) * (audioJitter * 0.6);
      gdy = (Math.random() - 0.5) * (audioJitter * 0.3);

      // Static "Scanline" offset - occasional horizontal shifts
      if (Math.sin(elapsed * 0.05 + noisePhase) > 0.99) {
        gdx += (Math.random() - 0.5) * 15;
      }

      // Subtle constant depth buzz
      sizeMult =
        1.0 + Math.sin(baseT * 0.5 + noisePhase) * 0.05 + levels.mid * 0.1;
    }

    return {
      dx: (floatX + shiverX + gdx) * scale,
      dy: (floatY + shiverY + gdy) * scale,
      springScale,
      sizeMult
    };
  }
};
