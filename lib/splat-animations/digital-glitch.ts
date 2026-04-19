import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Digital Glitch (Lightning Spike Edition)
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
      p.glitchSensitivity = 0.5 + Math.random() * 0.5;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const seed = p.glitchSeed ?? 0.5;
    const { audioData, scale } = ctx;

    // 1. Chaotic Signal Noise base
    const baseT = elapsed * 0.003;
    const noiseX = Math.sin(baseT + seed * 20) * 2;
    const noiseY = Math.cos(baseT + seed * 20) * 2;

    // --- Audio Reactivity ---
    let audioGlitchFactor = 0;
    let audioJitter = 0;

    if (audioData) {
      // Bass frequencies (indices 2-6) drive the glitching
      const bass = (audioData[2] + audioData[4] + audioData[6]) / 3;
      audioGlitchFactor = Math.pow(bass / 255, 2); // Exponent for sharper peaks

      // High frequencies (indices 40-80) drive tiny jitter
      const treble = (audioData[40] + audioData[60] + audioData[80]) / 3;
      audioJitter = (treble / 255) * 15;
    }

    // 2. Multi-stage Glitch Window
    const pattern =
      Math.sin(elapsed * 0.004) +
      Math.sin(elapsed * 0.009) +
      audioGlitchFactor * 1.5;
    const isGlitching = pattern > 1.7;

    let gdx = 0;
    let gdy = 0;
    let color: string | undefined = undefined;
    let springScale = 1.0;

    if (isGlitching) {
      springScale = 0.01;
      // High-intensity spike
      gdx = (Math.random() - 0.5) * (40 + audioJitter * 2);
      gdy = (Math.random() - 0.5) * (10 + audioJitter);
      if (audioGlitchFactor > 0.6) {
        color = '255, 255, 255'; // Flash white on peaks
      }
    } else {
      const nearGlitch = pattern > 1.5;
      springScale = nearGlitch ? 0.3 : 1.2;

      // Add audio-driven jitter
      if (audioJitter > 2) {
        gdx = (Math.random() - 0.5) * audioJitter;
        gdy = (Math.random() - 0.5) * audioJitter;
      }
    }

    return {
      dx: (noiseX + gdx) * scale,
      dy: (noiseY + gdy) * scale,
      colorOverride: color,
      springScale
    };
  }
};
