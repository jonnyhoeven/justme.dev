import type { AudioFeel } from './audio-utils';

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
  cr: number;
  cg: number;
  cb: number;

  /**
   * Animation-specific state.
   * Each animation module owns its own keys within this object.
   * This prevents SplatParticle from becoming a bloated "god object".
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animState: Record<string, any>;
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
  /** Display scale factor (avatar size / 320) */
  scale: number;
  /** X offset of the 320-unit avatar space within the canvas (the avatar is anchored in the hero image column) */
  offsetX: number;
  /** Y offset of the 320-unit avatar space within the canvas */
  offsetY: number;
  mouseX: number;
  mouseY: number;
  /** Full-canvas area available to scenes (left padding already removed) */
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  /** Frequency data from the audio analyzer (0-255) */
  audioData?: Uint8Array;
  /** Smoothed band levels and beat info (calculated once per frame) */
  audioLevels: AudioFeel;
  /** Milliseconds since the previous frame (clamped to 100) */
  dt: number;
}

export interface SplatAnimation {
  name: string;
  /** One-time setup — tag particles, assign depths, etc. */
  init(particles: SplatParticle[]): void;
  /**
   * Optional pre-pass before the particle loop.
   * Useful for capturing state snapshots or global computations.
   */
  beforeFrame?(
    particles: SplatParticle[],
    elapsed: number,
    ctx: AnimationContext
  ): void;
  /**
   * Optional background-glow intensity (0 = off, 1 = normal, up to ~1.5).
   * Smoothed by HeroSplat and applied to a DOM layer behind the canvas, so
   * it costs nothing per frame beyond one opacity/transform write.
   * Defaults to a gentle idle pulse plus bass reactivity.
   */
  glow?(elapsed: number, ctx: AnimationContext): number;
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

/** Absolute canvas-space target for one particle in a full-canvas scene. */
export interface SceneTarget {
  x: number;
  y: number;
  /** Size multiplier (default 1) */
  sizeMult: number;
  /** Replacement colour "r, g, b"; undefined keeps the avatar colour */
  colorOverride?: string;
}

/** A rectangle in canvas px that the background glow is stretched to fill. */
export interface GlowRect {
  /** Centre */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A full-canvas scene. HeroSplat morphs particles from their avatar position
 * to the scene target and back. Scenes may write `p.x/p.y` directly to
 * respawn a particle without it flying across the canvas.
 */
export interface SplatScene {
  name: string;
  /** Overall opacity while the scene is fully shown (default 1). Keeps busy scenes from fighting the hero text. */
  alpha?: number;
  /** Strength of the DOM glow behind the canvas while the scene is shown (default 1, 0 = off). Text scenes switch it off so it doesn't tint the letters. */
  glow?: number;
  /**
   * Stretch the DOM glow into this rectangle instead of a circle in the middle
   * of the area (it also loses its hollow centre), e.g. to act as a floor.
   * Write into `out`; called every frame.
   */
  glowRect?(ctx: AnimationContext, out: GlowRect): void;
  /** Assign slots / build lookups. Called once per scene start. */
  init(particles: SplatParticle[], ctx: AnimationContext): void;
  /** Per-frame precompute. `elapsed` is ms since the scene started. */
  beforeFrame?(elapsed: number, ctx: AnimationContext): void;
  /** Fill `out` with the target for particle `i`. Must set x, y and sizeMult. */
  target(
    p: SplatParticle,
    i: number,
    elapsed: number,
    ctx: AnimationContext,
    out: SceneTarget
  ): void;
}
