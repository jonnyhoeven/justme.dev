import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Ambient Wind Waves
 *
 * A slow sine wave travels horizontally across the particles,
 * making the portrait gently ripple like a reflection on water.
 * Gentle ripple — period ~8s, amplitude ±3.5px.
 */
export const windWaves: SplatAnimation = {
  name: 'Wind Waves',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individualize the wave phase and amplitude
      p.wavePhaseOffset = Math.random() * Math.PI * 2;
      // 80% to 120% variation in how much they're affected by the wind
      p.breathAmpMult = 0.8 + Math.random() * 0.4;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.wavePhaseOffset ?? 0;
    const ampMult = p.breathAmpMult ?? 1;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    const amplitude = (6.0 + levels.bass * 30.0) * ampMult;
    const frequency = 0.05; // spatial frequency
    // Speed increases with audio mid-range
    const speed = 0.0015 + levels.mid * 0.005;

    // Primary ripple wave
    const waveY =
      Math.sin(p.ox * frequency + elapsed * speed + phase) * amplitude;

    // Pronounced wind gust on X
    const windGust =
      Math.sin(p.ox * frequency * 0.5 + elapsed * speed * 0.8 + phase) *
      (amplitude * 0.8);

    // High-frequency interference layer for turbulence (driven by treble)
    const turbulence = 1.5 + levels.treble * 15.0;
    const interference = Math.sin(p.oy * 0.1 + elapsed * 0.005) * turbulence;

    const waveX = windGust + interference;

    return {
      dx: waveX * scale,
      dy: (waveY + interference * 0.5) * scale
    };
  }
};
