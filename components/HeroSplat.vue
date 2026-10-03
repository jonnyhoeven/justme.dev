<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import {
  useWindowSize,
  useElementVisibility,
  useThrottleFn
} from '@vueuse/core';
import {
  pickRandomAnimation,
  animations,
  type SplatParticle,
  type AnimationContext,
  type SplatAnimation
} from '../lib/splat-animations';
import { scenes } from '../lib/splat-scenes';
import type {
  GlowRect,
  SceneTarget,
  SplatScene
} from '../lib/splat-animations/types';
import {
  AudioTracker,
  ZERO_AUDIO_LEVELS
} from '../lib/splat-animations/audio-utils';
import { setDarkTheme } from '../lib/splat-animations/color-utils';
import useMusic from '../.vitepress/theme/composables/useMusic';
import { SITE_CONSTANTS } from '../.vitepress/constants';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const layerRef = ref<HTMLElement | null>(null);
const glowRef = ref<HTMLElement | null>(null);
let animationId = 0;

const stopLoop = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
};

let startLoop = () => {};
const particles: SplatParticle[] = [];

// Physics parameters
const spring = 0.05;
const damp = 0.8;
const repulsionRange = 120;
const hoverForce = 5;

const mouse = { x: -9999, y: -9999 };
// The canvas covers the whole hero; the 320-unit avatar space is scaled and
// anchored over the hero image column (see resize()).
let width = 320;
let height = 320;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let glowSize = 480;
let anchorPx = { x: 0, y: 0 };
let glowLevel = 1;
let lastGlowWrite = -1;
let lastGlowMorph = 0;
const animCtxAreaCenter = { x: 0, y: 0 };
const MIN_AVATAR_SCALE = 0.7;
const MAX_AVATAR_SCALE = 1.25;
const currentAnimationIndex = ref(0);
const logActive = (kind: 'avatar' | 'scene', name: string) => {
  if (import.meta.env.DEV) {
    console.log(`🎨 ${kind}: ${name}`);
  }
};
const currentAnimation = ref<SplatAnimation | null>(null);
const { width: windowWidth } = useWindowSize();
const isMobileView = computed(() => windowWidth.value < 768);
const shiverIntensity = ref(0);
let startTime = performance.now();

// Director: avatar animation -> morph -> full-canvas scene -> morph -> ...
type Phase = 'avatar' | 'toScene' | 'scene' | 'toAvatar';
let phase: Phase = 'avatar';
let phaseStart = 0;
let sceneStart = 0;
let sceneCounter = -1;
let currentScene: SplatScene | null = null;
let skipRequested = false;
let morphLinear = 0;
let fastMorph = false;
let lastFrameTime = 0;
// Heavier (darker) particles lag behind during a morph, by up to this much
const MORPH_STAGGER = 0.35;
// Scenes track their targets more tightly than the soft avatar spring
const SCENE_SPRING_SCALE = 2.5;
const ZERO_EFFECT = Object.freeze({ dx: 0, dy: 0 });
const audioTracker = new AudioTracker();
// Every kick pumps the whole cloud outwards from its centre (px per frame at beat = 1)
const BEAT_PUNCH = 2.5;
const BEAT_SIZE_PUMP = 0.45;
// The avatar also breathes: bass/kicks swell its whole outline (fraction of radius)
const BEAT_SWELL = 0.07;
const sceneOut: SceneTarget = { x: 0, y: 0, sizeMult: 1, alpha: 1 };
const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const { audioData, isMusicVisible, setSplatVisible } = useMusic();
const isVisible = useElementVisibility(canvasRef);

const brushCache = new Map<string, HTMLCanvasElement>();

const resize = () => {
  const canvas = canvasRef.value;
  const layer = layerRef.value;
  if (!canvas || !layer) return;
  const rect = layer.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  // Assigning width/height clears the canvas, so only do it on real changes
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  // Anchor the avatar on VitePress' image column, whatever the breakpoint
  const anchor = layer
    .closest('.VPHero')
    ?.querySelector('.image-container')
    ?.getBoundingClientRect();
  const anchorW = anchor?.width || 320;
  const anchorX = anchor
    ? anchor.left + anchor.width / 2 - rect.left
    : width / 2;
  const anchorY = anchor
    ? anchor.top + anchor.height / 2 - rect.top
    : height / 2;

  scale = Math.min(
    MAX_AVATAR_SCALE,
    Math.max(MIN_AVATAR_SCALE, Math.min(anchorW, height) / 320)
  );
  anchorPx = { x: anchorX, y: anchorY };
  offsetX = anchorX - 160 * scale;
  offsetY = anchorY - 160 * scale;

  glowSize = Math.min(height * 0.95, 720); // stay inside the layer: no clipped edges
  const glow = glowRef.value;
  if (glow) {
    glow.style.width = glow.style.height = `${glowSize}px`;
    glow.style.left = `${anchorX - glowSize / 2}px`;
    glow.style.top = `${anchorY - glowSize / 2}px`;
  }
};

const glowRect: GlowRect = { x: 0, y: 0, w: 0, h: 0 };

/** Smoothly drive the DOM glow behind the canvas (compositor-only props). */
const updateGlow = (
  target: number,
  morph: number,
  scene: SplatScene | null,
  sceneCtx: AnimationContext
) => {
  glowLevel += (target - glowLevel) * 0.08;
  // Skip writes while the value is effectively unchanged
  if (
    (Math.abs(glowLevel - lastGlowWrite) < 0.004 && morph === lastGlowMorph) ||
    !glowRef.value
  )
    return;
  lastGlowWrite = glowLevel;
  lastGlowMorph = morph;
  const level = Math.max(0, glowLevel);
  // Scenes use the whole hero, so the glow drifts to the middle of the area,
  // or is stretched over the rectangle the scene asks for
  let cx = animCtxAreaCenter.x;
  let cy = animCtxAreaCenter.y;
  let rx = 1;
  let ry = 1;
  let core = 0;
  if (scene?.glowRect) {
    scene.glowRect(sceneCtx, glowRect);
    cx = glowRect.x;
    cy = glowRect.y;
    rx = glowRect.w / glowSize;
    ry = glowRect.h / glowSize;
    core = morph;
  }
  const gx = (cx - anchorPx.x) * morph;
  const gy = (cy - anchorPx.y) * morph;
  const pulse = 0.85 + Math.min(level, 1.5) * 0.15;
  const sx = (1 + (rx - 1) * morph) * pulse;
  const sy = (1 + (ry - 1) * morph) * pulse;
  glowRef.value.style.opacity = String(Math.min(1, level * 0.95));
  glowRef.value.style.setProperty('--glow-core', String(core));
  glowRef.value.style.transform = `translate(${gx}px, ${gy}px) scale(${sx}, ${sy})`;
};

let heroEl: HTMLElement | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;

let onShiverMouseMove: ((e: MouseEvent) => void) | null = null;

/** Switch the avatar-mode animation to the next one. */
const nextAnimation = () => {
  currentAnimationIndex.value =
    (currentAnimationIndex.value + 1) % animations.length;
  const animation = animations[currentAnimationIndex.value];

  animation.init(particles);
  currentAnimation.value = animation;
  if (layerRef.value) layerRef.value.dataset.animation = animation.name;
  logActive('avatar', animation.name);
  startTime = performance.now();
};

onMounted(async () => {
  setDarkTheme(document.documentElement.classList.contains('dark'));
  themeObserver = new MutationObserver(() => {
    setDarkTheme(document.documentElement.classList.contains('dark'));
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d', {
    alpha: true,
    desynchronized: true
  });
  if (!ctx) return;

  // 1. Data Ingestion & Mobile Detection
  let particlesLoaded = false;
  const loadParticles = async () => {
    if (particlesLoaded || isMobileView.value) return;
    particlesLoaded = true;
    try {
      const res = await fetch('/data/splats.json');
      if (res.ok) {
        const data = await res.json();

        particles.push(
          ...data.map((p: [number, number, number, number, number]) => {
            const [ox, oy, cr, cg, cb] = p;
            // Calculate mass client-side based on luminance (Darker = Heavier)
            const luminance = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255.0;
            const mass = 0.5 + Math.max(0, 1 - luminance) * 1.5;

            return {
              ox,
              oy,
              x: ox,
              y: oy,
              vx: 0,
              vy: 0,
              color: `${cr}, ${cg}, ${cb}`,
              mass,
              cr,
              cg,
              cb,
              animState: {}
            };
          })
        );

        // Initial scatter across the whole hero; the springs pull them home
        particles.forEach((p) => {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        });

        if (currentAnimation.value) {
          currentAnimation.value.init(particles);
        }
      }
    } catch (e) {
      console.error('Failed to load splat data', e);
    }
  };

  // 2. Layout first, so the scatter and avatar anchor use real dimensions
  heroEl = layerRef.value?.closest('.VPHero') as HTMLElement | null;
  resize();

  if (!isMobileView.value) {
    await loadParticles();
  }

  // 3. Optimized Material Brush Caching
  const getBrush = (color: string) => {
    if (brushCache.has(color)) return brushCache.get(color)!;

    // Oversample (32px source for ~16px draw) provides free antialiasing/sharpness
    const size = 32;
    const center = size / 2;
    const radius = size * 0.35; // Leave room for shadow/feather

    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctxC = c.getContext('2d')!;

    const grad = ctxC.createRadialGradient(
      center,
      center,
      radius,
      center,
      center,
      radius + 1
    );
    grad.addColorStop(0, `rgb(${color})`);
    grad.addColorStop(1, `rgba(${color}, 0.2)`);

    ctxC.fillStyle = grad;
    ctxC.beginPath();
    ctxC.arc(center, center, radius + 1, 0, Math.PI * 2);
    ctxC.fill();

    brushCache.set(color, c);
    return c;
  };

  // 4. Layout & input handlers. Pointer events come from the hero itself
  // (not the canvas) because the text and buttons float above the canvas.
  resizeObserver = new ResizeObserver(resize);
  if (layerRef.value) resizeObserver.observe(layerRef.value);
  const imageEl = heroEl?.querySelector('.image-container');
  if (imageEl) resizeObserver.observe(imageEl);
  heroEl?.addEventListener('mousemove', onMouseMove);
  heroEl?.addEventListener('mouseleave', onMouseLeave);
  heroEl?.addEventListener('click', onClick);

  // 5. Animation Setups
  const { animation: firstAnim, index: firstIndex } = pickRandomAnimation();
  if (firstAnim) {
    currentAnimationIndex.value = firstIndex;
    currentAnimation.value = firstAnim;
    currentAnimation.value.init(particles);
    if (layerRef.value) layerRef.value.dataset.animation = firstAnim.name;
    logActive('avatar', firstIndex + ' ' + firstAnim.name);
    startTime = performance.now();
  }

  // 6. Physics Render Loop
  const animCtx: AnimationContext = {
    width,
    height,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    mouseX: mouse.x,
    mouseY: mouse.y,
    areaX: 0,
    areaY: 0,
    areaW: width,
    areaH: height,
    audioData: undefined,
    audioLevels: ZERO_AUDIO_LEVELS,
    dt: 16
  };

  const setPhase = (next: Phase, time: number) => {
    phase = next;
    phaseStart = time;
    if (layerRef.value) layerRef.value.dataset.phase = next;
    if (next === 'toScene') {
      currentScene = scenes[++sceneCounter % scenes.length];
      sceneStart = time;
      if (layerRef.value) layerRef.value.dataset.scene = currentScene.name;
      logActive('scene', currentScene.name);
      currentScene.init(particles, animCtx);
    } else if (next === 'toAvatar') {
      nextAnimation();
    }
  };

  const render = (time: number) => {
    if (isMobileView.value || !isVisible.value) {
      animationId = 0;
      return;
    }

    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const elapsed = time - startTime;

    animCtx.width = width;
    animCtx.height = height;
    animCtx.scale = scale;
    animCtx.offsetX = offsetX;
    animCtx.offsetY = offsetY;
    animCtx.mouseX = mouse.x;
    animCtx.mouseY = mouse.y;
    animCtx.areaX = width * SITE_CONSTANTS.SPLAT_SCENE_LEFT_PAD;
    animCtx.areaY = 0;
    animCtx.areaW = width - animCtx.areaX;
    animCtx.areaH = height;
    animCtxAreaCenter.x = animCtx.areaX + animCtx.areaW / 2;
    animCtxAreaCenter.y = height / 2;
    const dt = Math.min(100, time - lastFrameTime);
    lastFrameTime = time;
    animCtx.dt = dt;
    animCtx.audioData = audioData.value || undefined;
    animCtx.audioLevels = audioTracker.update(animCtx.audioData, dt);
    const beat = animCtx.audioLevels.beat;

    if (!currentAnimation.value) return;
    const anim = currentAnimation.value;

    // --- Director: a click (or the timer) always moves to the *other* kind
    // of item next: a1 -> s1 -> a2 -> s2 ... Clicks mid-morph reverse it
    // smoothly, since the morph value eases towards its target.
    if (phaseStart === 0) phaseStart = time;
    const skip = skipRequested;
    skipRequested = false;
    const phaseT = time - phaseStart;
    if (skip) {
      fastMorph = true;
      // Instant feedback: a small random burst before the morph pulls in
      for (const p of particles) {
        p.vx += (Math.random() - 0.5) * 10;
        p.vy += (Math.random() - 0.5) * 10;
      }
      setPhase(
        phase === 'avatar' || phase === 'toAvatar' ? 'toScene' : 'toAvatar',
        time
      );
    } else if (phase === 'avatar' && phaseT > SITE_CONSTANTS.SPLAT_CYCLE_TIME) {
      fastMorph = false;
      setPhase('toScene', time);
    } else if (phase === 'scene' && phaseT > SITE_CONSTANTS.SPLAT_SCENE_TIME) {
      fastMorph = false;
      setPhase('toAvatar', time);
    }

    const towardsScene = phase === 'toScene' || phase === 'scene';
    morphLinear = Math.min(
      1,
      Math.max(
        0,
        morphLinear +
          ((towardsScene ? 1 : -1) * dt) /
            (fastMorph
              ? SITE_CONSTANTS.SPLAT_MORPH_CLICK_TIME
              : SITE_CONSTANTS.SPLAT_MORPH_TIME)
      )
    );
    if (phase === 'toScene' && morphLinear >= 1) setPhase('scene', time);
    else if (phase === 'toAvatar' && morphLinear <= 0) setPhase('avatar', time);
    // Clicks use an ease-out (moves immediately); the timer a gentle ease-in-out
    const morph = fastMorph
      ? 1 - (1 - morphLinear) * (1 - morphLinear)
      : smoothstep(morphLinear);
    const stagger = fastMorph ? MORPH_STAGGER * 0.5 : MORPH_STAGGER;
    const scene = morph > 0 ? currentScene : null;
    const sceneElapsed = time - sceneStart;

    if (morph < 1 && anim.beforeFrame) {
      anim.beforeFrame(particles, elapsed, animCtx);
    }
    if (scene?.beforeFrame) scene.beforeFrame(sceneElapsed, animCtx);

    const sceneGlow = scene ? 1 + ((scene.glow ?? 1) - 1) * morph : 1;
    updateGlow(
      ((anim.glow && morph < 0.5
        ? anim.glow(elapsed, animCtx)
        : 0.85 + Math.sin(elapsed * 0.001) * 0.15 + animCtx.audioLevels.bass) +
        beat * 0.35) *
        sceneGlow,
      // Scenes without a glow (text) fade it out in place instead of drifting it
      scene?.glow === 0 ? 0 : morph,
      scene,
      animCtx
    );

    // Cache some values outside the particle loop for performance
    const shiverInt = shiverIntensity.value;
    const hasShiver = shiverInt > 0.05;
    const vT = time * 0.1; // for shiver

    // Kick punch: radiates from the avatar centre, drifting to the scene centre
    const punch = beat > 0.02 ? beat * BEAT_PUNCH * scale : 0;
    const punchX = anchorPx.x + (animCtxAreaCenter.x - anchorPx.x) * morph;
    const punchY = anchorPx.y + (animCtxAreaCenter.y - anchorPx.y) * morph;
    const punchReach = 140 * scale;
    const swellAmt = BEAT_SWELL * (1 - morph);

    // Repulsion params
    const rRange = repulsionRange;
    const hForce = hoverForce;
    let lastAlpha = -1;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const swell = 1 + (beat + animCtx.audioLevels.bass * 0.5) * swellAmt;
      const baseTargetOx =
        anchorPx.x + (p.ox * scale + offsetX - anchorPx.x) * swell;
      const baseTargetOy =
        anchorPx.y + (p.oy * scale + offsetY - anchorPx.y) * swell;
      const effect =
        morph < 1 ? anim.apply(p, elapsed, animCtx, particles) : ZERO_EFFECT;
      let targetOx = baseTargetOx + effect.dx;
      let targetOy = baseTargetOy + effect.dy;
      let springMul = effect.springScale ?? 1;
      let sMult = (effect.sizeMult ?? 1.0) * (1 + beat * BEAT_SIZE_PUMP);
      let color = effect.colorOverride;
      let alpha = 1;

      if (scene) {
        // Per-particle progress through the morph, staggered by mass
        const delay = ((p.mass - 0.5) / 1.5) * stagger;
        const m = smoothstep((morph - delay) / (1 - stagger));
        if (m > 0) {
          sceneOut.sizeMult = 1;
          sceneOut.alpha = 1;
          sceneOut.colorOverride = undefined;
          scene.target(p, i, sceneElapsed, animCtx, sceneOut);
          targetOx += (sceneOut.x - targetOx) * m;
          targetOy += (sceneOut.y - targetOy) * m;
          sMult += (sceneOut.sizeMult - sMult) * m;
          springMul += (SCENE_SPRING_SCALE - springMul) * m;
          if (m > 0.5 && sceneOut.colorOverride) color = sceneOut.colorOverride;
          // Scene opacity, fading out towards the left where the hero text is
          const leftFade = SITE_CONSTANTS.SPLAT_SCENE_LEFT_FADE;
          const xFade =
            leftFade + (1 - leftFade) * smoothstep((p.x / width) * 1.3);
          alpha = 1 - (1 - (scene.alpha ?? 1) * xFade * sceneOut.alpha) * m;
        }
      }
      const effectiveSpring = spring * springMul;

      const dxm = p.x - mouse.x;
      const dym = p.y - mouse.y;
      const distSq = dxm * dxm + dym * dym;

      let fx = 0;
      let fy = 0;

      // Optimized Repulsion (avoiding Sqrt if not needed)
      if (distSq < rRange * rRange && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (rRange - dist) / rRange;
        fx += ((dxm / dist) * force * hForce) / p.mass;
        fy += ((dym / dist) * force * hForce) / p.mass;
      }

      // Spring
      fx += -effectiveSpring * (p.x - targetOx);
      fy += -effectiveSpring * (p.y - targetOy);

      // --- Shiver Effect (Easter Egg) ---
      if (hasShiver) {
        const vPhase = p.ox * 0.5 + p.oy * 0.5;
        const vibe = Math.sin(vT + vPhase) * shiverInt * 10;
        fx += vibe;
        fy += vibe;
      }

      if (punch) {
        const px = p.x - punchX;
        const py = p.y - punchY;
        const pd = Math.sqrt(px * px + py * py) || 1;
        const k = (punch * (0.4 + Math.min(1, pd / punchReach))) / pd / p.mass;
        fx += px * k;
        fy += py * k;
      }

      if (effect.nudgeVx) fx += effect.nudgeVx;
      if (effect.nudgeVy) fy += effect.nudgeVy;

      p.vx = (p.vx + fx) * damp;
      p.vy = (p.vy + fy) * damp;
      p.x += p.vx;
      p.y += p.vy;

      if (alpha !== lastAlpha) {
        ctx.globalAlpha = alpha;
        lastAlpha = alpha;
      }
      const halfSize = 8 * scale * sMult; // 8 = brushSize(16) / 2

      if (color) {
        // Circular draw for dynamic colors with a slight "bloom" feel
        ctx.fillStyle = `rgb(${color})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, halfSize * 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const brush = getBrush(p.color);
        ctx.drawImage(
          brush,
          p.x - halfSize * 1.2, // Padding for the built-in brush shadow
          p.y - halfSize * 1.2,
          halfSize * 2.4,
          halfSize * 2.4
        );
      }
    }
    animationId = requestAnimationFrame(render);
  };

  // 7. Easter Egg Hook: "Just make it!" -> "Just make IT!"
  const hookTagline = () => {
    const tagline = document.querySelector('.tagline');
    if (!tagline || tagline.querySelector('.it-btn')) return;
    const text = tagline.textContent || '';
    if (text.includes('it!')) {
      tagline.innerHTML = text.replace(
        'it!',
        '<span class="it-btn" style="cursor: pointer; transition: all 0.2s ease; font-weight: bold;">it!</span>'
      );
      const btn = tagline.querySelector('.it-btn') as HTMLElement;
      if (btn) {
        // --- Proximity Shiver (Hot/Cold) ---
        if (onShiverMouseMove) {
          window.removeEventListener('mousemove', onShiverMouseMove);
        }
        onShiverMouseMove = useThrottleFn((e: MouseEvent) => {
          if (isMobileView.value || isMusicVisible.value) {
            shiverIntensity.value = 0;
            return;
          }
          const rect = btn.getBoundingClientRect();
          const bx = rect.left + rect.width / 2;
          const by = rect.top + rect.height / 2;
          const dx = e.clientX - bx;
          const dy = e.clientY - by;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Shiver
          const maxDist = 70;
          if (dist < maxDist) {
            shiverIntensity.value = 0.5 * (1 - dist / maxDist);
          } else {
            shiverIntensity.value = 0;
          }
        }, 50);
        window.addEventListener('mousemove', onShiverMouseMove);

        btn.onclick = () => {
          if (isMobileView.value) return;
          isMusicVisible.value = !isMusicVisible.value;
          if (isMusicVisible.value) {
            btn.innerText = 'IT!';
            btn.style.color = 'var(--vp-c-brand)';
            btn.style.textDecorationColor = 'var(--vp-c-brand)';
            // console.log('🎵 Music Easter Egg ACTIVE');
          } else {
            btn.innerText = 'it!';
            btn.style.color = '';
            btn.style.textDecorationColor = 'transparent';
            // console.log('🔇 Music Easter Egg INACTIVE');
          }
        };
      }
    }
  };
  hookTagline();
  setTimeout(hookTagline, 1000);

  startLoop = () => {
    if (isMobileView.value || !isVisible.value) return;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(render);
  };

  watch(
    isVisible,
    (visible) => {
      setSplatVisible(visible);
      if (visible) {
        startLoop();
      } else {
        stopLoop();
      }
    },
    { immediate: true }
  );

  watch(isMobileView, async (isMobile) => {
    if (!isMobile) {
      if (!particlesLoaded) {
        await loadParticles();
      }
      startLoop();
    } else {
      stopLoop();
    }
  });
});

onBeforeUnmount(() => {
  stopLoop();
  startLoop = () => {};
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  heroEl?.removeEventListener('mousemove', onMouseMove);
  heroEl?.removeEventListener('mouseleave', onMouseLeave);
  heroEl?.removeEventListener('click', onClick);
  if (onShiverMouseMove) {
    window.removeEventListener('mousemove', onShiverMouseMove);
  }
  setSplatVisible(false);
});

// Input Handlers
const onMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
};
const onMouseLeave = () => {
  mouse.x = -9999;
  mouse.y = -9999;
};
const onClick = (e: MouseEvent) => {
  // Links, buttons and the music toggle keep their own behaviour
  if ((e.target as Element | null)?.closest('a, button, .it-btn')) return;
  // Skip ahead: avatar -> scene, or scene -> avatar
  skipRequested = true;
};
</script>

<template>
  <div v-show="isMobileView" class="HeroSplat fallback-image">
    <img src="/images/ava.webp" alt="Justme.dev Avatar" />
  </div>
  <!-- Full-hero background layer: glow (back) -> canvas (front). The hero text
       and buttons sit above it via VitePress' own z-index on .main. -->
  <div v-show="!isMobileView" ref="layerRef" class="splat-layer">
    <div ref="glowRef" class="splat-glow" aria-hidden="true"></div>
    <canvas
      ref="canvasRef"
      role="img"
      aria-label="Interactive 3D particle simulation of avatar"
    ></canvas>
  </div>
</template>

<style scoped>
.HeroSplat {
  width: 100%;
  height: 100%;
  position: absolute;
}

@media (max-width: 959px) {
  .HeroSplat {
    margin-top: 24px;
  }
}

.fallback-image {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 7.5rem;
}

.fallback-image img {
  width: 100%;
  max-width: 320px;
  max-height: 320px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* Positioned against .VPHero .container (see layout.css), bleeding slightly
   past it so particles can drift without hitting a hard edge. */
.splat-layer {
  --bleed: 24px;
  position: absolute;
  inset: calc(var(--bleed) * -1);
  z-index: 0;
  pointer-events: none;
  /* Feather the edges so the canvas never shows a visible rectangle */
  mask-image:
    linear-gradient(to right, transparent, #000 5%, #000 95%, transparent),
    linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent);
  mask-composite: intersect;
  -webkit-mask-composite: source-in;
}

/* The old VitePress .image-bg glow: same theme gradients, but softened with a
   mask instead of a 100px blur filter, and animated via opacity/transform. */
.splat-glow {
  position: absolute;
  border-radius: 50%;
  background-image: var(--vp-home-hero-image-background-image);
  /* Hollow centre: the glow haloes the face instead of tinting it purple */
  mask-image: radial-gradient(
    closest-side,
    rgba(0, 0, 0, var(--glow-core, 0)) 30%,
    #000 55%,
    transparent 100%
  );
  will-change: opacity, transform;
}

canvas {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  will-change: transform;
}
</style>
