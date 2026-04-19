import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';

/**
 * Flubber Motion
 *
 * A tribute to the original Xbox "X-Blob" boot animation.
 * Instead of simple breathing, it uses multiple layers of asynchronous
 * noise to create "lumps" of motion that shift through the mass.
 *
 * It stays viscous and organic, feeling like a heavy fluid state.
 */
export const flubberMotion: SplatAnimation = {
  name: 'Flubber Motion',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individual phase offsets to break up uniformity
      p.breathPhaseOffset = Math.random() * Math.PI * 0.5;
      // Each particle gets a "sensitivity" to the global noise
      p.breathAmpMult = 0.5 + Math.random() * 1.0;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0;
    const ampMult = p.breathAmpMult ?? 1;
    const { scale } = ctx;
    const levels = ctx.audioLevels;

    // --- Audio Reactivity ---
    const audioBoost = levels.volume * 2.0;

    // --- The "Lumpy" Logic ---
    // We use 3 layers of motion moving at different speeds (flubber-style)
    // Layer 1: Large slow pulse (The "Breath") - Bass drives extra expand
    const layer1 =
      Math.sin(elapsed * 0.0008 + phase) * (8 + levels.bass * 20) * ampMult;

    // Layer 2: Medium lumpy swell (The "Churn")
    // Mid/Bass frequencies increase the churn speed and amplitude
    const churnSpeed = 0.002 + levels.mid * 0.008;
    const lumpyPhaseX = elapsed * churnSpeed + p.ox * 0.04;
    const lumpyPhaseY = elapsed * churnSpeed + p.oy * 0.04;
    const layer2X = Math.sin(lumpyPhaseX) * (4 + levels.mid * 8);
    const layer2Y = Math.cos(lumpyPhaseY) * (4 + levels.mid * 8);

    // Layer 3: Toxic shiver (The "Energy")
    // Ultra-fast vibrations driven by Treble frequencies
    const treblyEnergy = levels.treble * 4.0;
    const layer3X = Math.sin(elapsed * 0.04 + phase) * (0.8 + treblyEnergy);
    const layer3Y = Math.cos(elapsed * 0.035 + phase) * (0.8 + treblyEnergy);

    // Combine for final displacement
    const dx = (layer1 * 0.5 + layer2X + layer3X) * scale;
    const dy = (layer1 * 0.5 + layer2Y + layer3Y) * scale;

    // Viscosity control: spring gets "tighter" with audio energy
    const velocityFactor = Math.abs(layer2X + layer2Y) / 8;
    const springScale = 0.8 + velocityFactor * 0.4 + audioBoost * 0.5;

    return {
      dx,
      dy,
      springScale
    };
  }
};
