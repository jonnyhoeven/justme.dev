import type {
  SplatAnimation,
  SplatParticle,
  AnimationEffect,
  AnimationContext
} from './types';
import { getAudioLevels } from './audio-utils';

/**
 * Ferrofluid
 *
 * Simulates a magnetic fluid being pulled into sharp, jagged spikes.
 * Unlike "Flubber", this movement is snappy, sharp, and highly reactive
 * to the mouse (the primary magnet).
 *
 * Spikes form along radial "fingers" pointing toward the magnetic source.
 */
export const ferrofluid: SplatAnimation = {
  name: 'Ferrofluid',

  init(particles: SplatParticle[]) {
    for (const p of particles) {
      // Each particle has a unique harmonic phase and frequency
      p.breathPhaseOffset = Math.random() * Math.PI * 2;
      // This will determine the "spike" resonance for each particle
      p.breathSpeedMult = 0.8 + Math.random() * 0.4;
    }
  },

  apply(
    p: SplatParticle,
    elapsed: number,
    ctx: AnimationContext
  ): AnimationEffect {
    const phase = p.breathPhaseOffset ?? 0;
    const { audioData, scale, offsetX, offsetY } = ctx;
    const levels = getAudioLevels(audioData);

    // --- Magnet Source Selection ---
    // If mouse is off-screen, fallback to a 'ghost magnet' that drifts in the center
    const isMousePresent = ctx.mouseX > 0 && ctx.mouseY > 0;
    let targetX: number;
    let targetY: number;

    if (isMousePresent) {
      targetX = ctx.mouseX;
      targetY = ctx.mouseY;
    } else {
      // Ghost magnet drifts in a small infinity-pattern loop around the center
      const driftT = elapsed * 0.001;
      const gx = 160 + Math.sin(driftT) * 10;
      const gy = 160 + Math.sin(driftT * 2) * 10;
      targetX = gx * scale + offsetX;
      targetY = gy * scale + offsetY;
    }

    // Calculate distance and angle relative to the chosen magnet
    const dxMag = p.x - targetX;
    const dyMag = p.y - targetY;
    const distMag = Math.sqrt(dxMag * dxMag + dyMag * dyMag);

    // Safety check for div by zero
    if (distMag < 0.1) return { dx: 0, dy: 0, springScale: 1.5 };

    // The angle from the magnet determines which "spike" the particle stays in
    const angle = Math.atan2(dyMag, dxMag);

    // --- Audio-Driven Magnet Pulse ---
    // Even if mouse is far, the audio volume acts as a background magnetic field
    const audioBaseline = levels.volume * 0.7;
    const magneticRange = (300 + levels.bass * 200) * scale;
    const intensity = Math.max(
      audioBaseline,
      (magneticRange - distMag) / magneticRange
    );

    // --- Rosensweig Spikes Logic ---
    // N = number of spikes around a source
    const spikeCount = 14 + Math.floor(levels.bass * 20); // More spikes on bass
    // Use angle + time to create a slow rotation of the spikes
    const spikeRotationSpeed = 0.0015 + levels.mid * 0.01;
    const spikeWave = Math.sin(
      angle * spikeCount + elapsed * spikeRotationSpeed
    );

    // Higher power (4.0) makes the spikes much sharper/needle-like
    const audioSpikeBoost = levels.mid * 2.0;
    const spikeStrength = 10 + levels.bass * 20;
    const spikeFactor =
      Math.pow(Math.abs(spikeWave), 4.0 + audioSpikeBoost) *
      (spikeWave > 0 ? 1.8 : -0.4);

    // Stronger magnetic pull toward the source
    const attraction = -intensity * (20 + levels.bass * 60);

    // High-frequency "micro-spike" texture for natural jaggedness
    const microSpikes =
      Math.sin(angle * (45 + levels.treble * 100) + elapsed * 0.04) *
      (2.0 + levels.treble * 15) *
      intensity;

    const totalDisplacement =
      attraction + spikeFactor * intensity * spikeStrength + microSpikes;

    // Final displacements oriented along the magnetic field line
    const spikeDx = (dxMag / distMag) * totalDisplacement;
    const spikeDy = (dyMag / distMag) * totalDisplacement;

    // Background breathing/shimmering (Treble shimmer)
    const shiver = Math.sin(elapsed * 0.05 + phase) * (1.5 + levels.treble * 5);

    // Ferrofluid is STIFF and snappy
    const springScale = 1.1 + intensity * 1.5 + levels.bass;

    return {
      dx: (spikeDx + shiver * 0.5) * scale,
      dy: (spikeDy + shiver * 0.5) * scale,
      springScale
    };
  }
};
