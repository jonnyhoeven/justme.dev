import type { AudioLevels } from './audio-utils';

/**
 * Shared types for the splat animation system.
 *
 * Each animation module implements `SplatAnimation` and returns
 * per-particle `AnimationEffect`s that layer on top of the existing
 * spring-physics + mouse-repulsion engine in HeroSplat.vue.
 */

export interface SplatParticle {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  mass: number;

  /* ---- pre-parsed color channels (set during data load) ---- */
  cr?: number;
  cg?: number;
  cb?: number;

  /* ---- animation-assigned (set during init) ---- */
  isOutlier?: boolean;

  /* ---- orbital-drift assigned ---- */
  orbitCx?: number;
  orbitCy?: number;
  orbitSpeed?: number;

  /* ---- breathing assigned ---- */
  breathPhaseOffset?: number;
  breathSpeedMult?: number;
  breathAmpMult?: number;

  /* ---- floating-outliers assigned ---- */
  outlierPhase?: number;
  wanderFreq?: number;
  wanderAmp?: number;
  coreWobblePhase?: number;
  wavePhaseOffset?: number;
  partnerIdx?: number;
  glitchSeed?: number;
  glitchSensitivity?: number;

  /** Last seen elapsed time for delta-time calculations */
  lastElapsed?: number;
  /** Current angle for orbital animations */
  orbitAngle?: number;
  smoothedVolume?: number;
  /** Individual phase offset for music reactivity */
  individualPhase?: number;
  /** Per-particle depth/Z value */
  pz?: number;
}

export interface AnimationEffect {
  /** Screen-space offset added to the spring target X */
  dx: number;
  /** Screen-space offset added to the spring target Y */
  dy: number;
  /** Multiplier for the spring constant (default 1) */
  springScale?: number;
  /** Replacement colour string "r, g, b" for the brush cache */
  colorOverride?: string;
  /** One-shot velocity nudge X (added directly to vx) */
  nudgeVx?: number;
  /** One-shot velocity nudge Y (added directly to vy) */
  nudgeVy?: number;
  /** Size multiplier for depth effects (default 1.0) */
  sizeMult?: number;
}

export interface AnimationContext {
  width: number;
  height: number;
  /** Display scale factor (viewport / 320) */
  scale: number;
  /** X offset to center the 320-unit space in the viewport */
  offsetX: number;
  /** Y offset to center the 320-unit space in the viewport */
  offsetY: number;
  mouseX: number;
  mouseY: number;
  /** Frequency data from the audio analyzer (0-255) */
  audioData?: Uint8Array;
  /** Pre-computed audio levels (calculated once per frame) */
  audioLevels: AudioLevels;
}

export interface SplatAnimation {
  name: string;
  /** One-time setup — tag particles, assign depths, etc. */
  init(particles: SplatParticle[], width: number, height: number): void;
  /**
   * Per-particle, per-frame effect.
   * @param particle  The particle to animate
   * @param elapsed   Milliseconds since the animation started
   * @param ctx       Current viewport / mouse state
   */
  apply(
    particle: SplatParticle,
    elapsed: number,
    ctx: AnimationContext,
    particles: SplatParticle[]
  ): AnimationEffect;
}
