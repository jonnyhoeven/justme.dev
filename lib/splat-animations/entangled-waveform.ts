import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { getAudioLevels } from './audio-utils';

/**
 * Entangled Waveform / VU Meter
 *
 * Particles form a mirrored VU meter.
 * Left = Bass, Right = Treble.
 * 'Entanglement' occurs on peaks where top and bottom particles swap or sync.
 */
export const entangledWaveform: SplatAnimation = {
  name: 'Entangled Waveform',

  init(particles: SplatParticle[]) {
    // Partition particles into two horizontal layers
    // We'll use p.oy to determine if they are 'top' or 'bottom'
    // and sort them roughly by ox to assign them to audio bins.
    particles.forEach((p, i) => {
      // Use index parity as a stable way to split them 50/50
      // while preserving their original ox/oy for the base layout.
      p.isOutlier = i % 2 === 0; // true = Top, false = Bottom
    });
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const { audioData, scale } = ctx;
    if (!audioData) {
      return { dx: 0, dy: 0 };
    }

    const levels = getAudioLevels(audioData);
    const numBins = audioData.length;

    // Map ox (0-320) to frequency bin
    // We use a slight logarithmic-like focus on the lower/mid ranges where most energy is.
    const normalizedX = p.ox / 320;
    const binIdx = Math.floor(normalizedX * (numBins * 0.6)); // Focus on first 60% of bins
    const amplitude = (audioData[binIdx] || 0) / 255;

    const isTop = p.isOutlier;
    const time = elapsed * 0.002;

    // --- Dynamic Amplitude Mapping ---
    // Particles near the center line (160) have full movement.
    // Movement scales down linearly as we approach top/bottom edges to prevent overflow.
    const distFromCenter = Math.abs(p.oy - 160);
    const centerMult = Math.max(0.15, 1.0 - distFromCenter / 160);

    // Base waveform movement
    // Reduced overall waveAmp to keep it within canvas, scaled by centerMult
    const waveAmp = (15 + levels.bass * 50) * centerMult;
    const baseDy = amplitude * waveAmp * (isTop ? -1 : 1);

    // Entanglement: On high amplitude, they 'vibrate' towards each other
    let qdy = 0;
    let qdx = 0;
    const peakThreshold = 0.35;
    const entanglementStrength = Math.max(
      0,
      (amplitude - peakThreshold) / (1 - peakThreshold)
    );

    if (entanglementStrength > 0) {
      // High-frequency jitter
      qdx = (Math.random() - 0.5) * entanglementStrength * 15;
      // Oscillate between their mirrored positions
      qdy = Math.sin(time * 20) * entanglementStrength * 25;
    }

    // Gentle horizontal drift
    const driftX = Math.sin(time + p.ox * 0.05) * 4;

    // Color: Use base color and fade to white based on amplitude
    const baseColors = p.color.split(',').map((c) => parseInt(c.trim()));
    const [br, bg, bb] = baseColors;

    // Shift towards white (255, 255, 255) based on amplitude
    const r = Math.floor(br + (255 - br) * amplitude * 0.5);
    const g = Math.floor(bg + (255 - bg) * amplitude * 0.5);
    const b = Math.floor(bb + (255 - bb) * amplitude * 0.5);

    const colorOverride = `${r}, ${g}, ${b}`;

    return {
      dx: (driftX + qdx) * scale,
      dy: (baseDy + qdy) * scale,
      sizeMult: 0.8 + amplitude * 1.0, // Pulsing size with audio
      springScale: 1.0 - amplitude * 0.5, // Looser as they get louder
      colorOverride
    };
  }
};
