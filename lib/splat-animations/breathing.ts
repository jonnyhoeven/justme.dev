import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { getAudioLevels } from './audio-utils';

/**
 * Breathing / Pulse
 *
 * The entire splat cluster gently expands and contracts radially,
 * like it's breathing. Very slow (~10s cycle), very subtle (±2px).
 */
export const breathing: SplatAnimation = {
  name: 'Breathing',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Individualize the pulse
      p.breathPhaseOffset = Math.random() * Math.PI * 2;
      p.breathSpeedMult = 0.8 + Math.random() * 0.4; // 80% to 120% speed
      p.breathAmpMult = 0.5 + Math.random() * 1.5; // 50% to 200% amplitude
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0;
    const speed = p.breathSpeedMult ?? 1;
    const amp = p.breathAmpMult ?? 1;

    // --- Audio Reactivity ---
    const { audioData, scale } = ctx;
    const levels = getAudioLevels(audioData);
    const audioBoost = levels.bass * 2.5; // Bass drives extra expand/contract

    // Base pulse (~8s) + individual variations + audio reaction
    const breathCycle =
      Math.sin(elapsed * 0.0008 * speed + phase) * (12 * amp + audioBoost * 15);

    const cx = 160;
    const cy = 160;
    const angle = Math.atan2(p.oy - cy, p.ox - cx);

    return {
      dx: Math.cos(angle) * breathCycle * scale,
      dy: Math.sin(angle) * breathCycle * scale
    };
  }
};
