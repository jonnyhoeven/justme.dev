<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useWindowSize, useElementVisibility } from '@vueuse/core';
import {
  pickRandomAnimation,
  animations,
  type SplatParticle,
  type AnimationContext,
  type SplatAnimation
} from '../../../lib/splat-animations';
import { getAudioLevels } from '../../../lib/splat-animations/audio-utils';
import useMusic from '../composables/useMusic';
import { SITE_CONSTANTS } from '../../constants';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number;
const particles: SplatParticle[] = [];

// Physics parameters
const spring = 0.05;
const damp = 0.8;
const repulsionRange = 120;
const hoverForce = 5;

const mouse = { x: -9999, y: -9999 };
let width = 320;
let height = 320;
const currentAnimationIndex = ref(0);
const currentAnimation = ref<SplatAnimation | null>(null);
const { width: windowWidth } = useWindowSize();
const isMobileView = computed(() => windowWidth.value < 768);
const shiverIntensity = ref(0);
let startTime = performance.now();
let cycleInterval: ReturnType<typeof setInterval>;
const { audioData, isMusicVisible } = useMusic();
const isVisible = useElementVisibility(canvasRef);

/**
 * Cycle to the next animation.
 * Accessible to both the auto-timer and the manual 'Next' button.
 */
const nextAnimation = () => {
  currentAnimationIndex.value =
    (currentAnimationIndex.value + 1) % animations.length;
  const animation = animations[currentAnimationIndex.value];

  // Use a technical but friendly log
  console.log(`🎨 Animation: ${animation.name}`);

  animation.init(particles);
  currentAnimation.value = animation;
  startTime = performance.now();

  // Reset the auto-cycle timer if visible
  if (isVisible.value) {
    if (cycleInterval) clearInterval(cycleInterval);
    cycleInterval = setInterval(nextAnimation, SITE_CONSTANTS.SPLAT_CYCLE_TIME);
  }
};

onMounted(async () => {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d', { alpha: true });
  if (!ctx) return;

  // 1. Data Ingestion & Mobile Detection
  const isMobile = isMobileView.value;
  try {
    const res = await fetch('/data/splats.json');
    if (res.ok) {
      let data = await res.json();

      if (isMobile) {
        data = data.filter((_: unknown, i: number) => i % 2 !== 0);
      }

      particles.push(
        ...data.map((p: SplatParticle) => {
          const [cr, cg, cb] = p.color.split(',').map(Number);
          return {
            ...p,
            x: p.ox,
            y: p.oy,
            vx: 0,
            vy: 0,
            cr,
            cg,
            cb,
            animState: {}
          };
        })
      );
    }
  } catch (e) {
    console.error('Failed to load splat data', e);
  }

  // 2. Optimized Brush Caching
  const brushCache = new Map<string, HTMLCanvasElement>();
  const getBrush = (color: string) => {
    if (brushCache.has(color)) return brushCache.get(color)!;
    const size = 16;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctxC = c.getContext('2d')!;
    // Solid color fill (No feather/blur)
    ctxC.fillStyle = `rgb(${color})`;
    ctxC.fillRect(0, 0, size, size);
    brushCache.set(color, c);
    return c;
  };

  // 3. Layout Handlers
  const resize = () => {
    if (!canvasRef.value) return;
    const rect = canvasRef.value.parentElement?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvasRef.value.width = width;
      canvasRef.value.height = height;
    }
  };
  window.addEventListener('resize', resize);
  resize();

  // 4. Initial Position Scramble
  const initialScale = Math.min(width, height) / 320;
  const initialOffsetX = (width - 320 * initialScale) / 2;
  const initialOffsetY = (height - 320 * initialScale) / 2;
  particles.forEach((p) => {
    p.x = Math.random() * 320 * initialScale + initialOffsetX;
    p.y = Math.random() * 320 * initialScale + initialOffsetY;
  });

  // 5. Animation Setups
  const { animation: firstAnim, index: firstIndex } = pickRandomAnimation();
  if (firstAnim) {
    currentAnimationIndex.value = firstIndex;
    currentAnimation.value = firstAnim;
    currentAnimation.value.init(particles);
    startTime = performance.now();
  }

  // 6. Physics Render Loop
  const render = (time: number) => {
    if (isMobileView.value || !isVisible.value) {
      return;
    }

    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) / 320;
    const offsetX = (width - 320 * scale) / 2;
    const offsetY = (height - 320 * scale) / 2;
    const elapsed = time - startTime;

    const animCtx: AnimationContext = {
      width,
      height,
      scale,
      offsetX,
      offsetY,
      mouseX: mouse.x,
      mouseY: mouse.y,
      audioData: audioData.value || undefined,
      audioLevels: getAudioLevels(audioData.value || undefined)
    };

    if (!currentAnimation.value) return;
    const anim = currentAnimation.value;
    if (anim.beforeFrame) {
      anim.beforeFrame(particles, elapsed, animCtx);
    }

    // Cache some values outside the particle loop for performance
    const shiverInt = shiverIntensity.value;
    const hasShiver = shiverInt > 0.05;
    const vT = time * 0.1; // for shiver

    // Repulsion params
    const rRange = isMobile ? repulsionRange * 0.7 : repulsionRange;
    const hForce = isMobile ? hoverForce * 0.8 : hoverForce;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const baseTargetOx = p.ox * scale + offsetX;
      const baseTargetOy = p.oy * scale + offsetY;
      const effect = anim.apply(p, elapsed, animCtx, particles);
      const targetOx = baseTargetOx + effect.dx;
      const targetOy = baseTargetOy + effect.dy;
      const effectiveSpring = spring * (effect.springScale ?? 1);

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

      if (effect.nudgeVx) fx += effect.nudgeVx;
      if (effect.nudgeVy) fy += effect.nudgeVy;

      p.vx = (p.vx + fx) * damp;
      p.vy = (p.vy + fy) * damp;
      p.x += p.vx;
      p.y += p.vy;

      const sMult = effect.sizeMult ?? 1.0;
      const halfSize = 8 * scale * sMult; // 8 = brushSize(16) / 2

      if (effect.colorOverride) {
        // Direct fillRect for dynamic colors — avoids unbounded brush cache
        ctx.fillStyle = `rgb(${effect.colorOverride})`;
        ctx.fillRect(
          p.x - halfSize,
          p.y - halfSize,
          halfSize * 2,
          halfSize * 2
        );
      } else {
        const brush = getBrush(p.color);
        ctx.drawImage(
          brush,
          p.x - halfSize,
          p.y - halfSize,
          halfSize * 2,
          halfSize * 2
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
        window.addEventListener('mousemove', (e) => {
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

          // Shiver starts at 150px away
          const maxDist = 150;
          if (dist < maxDist) {
            shiverIntensity.value = 0.5 * (1 - dist / maxDist);
          } else {
            shiverIntensity.value = 0;
          }
        });

        btn.onclick = () => {
          if (isMobileView.value) return;
          isMusicVisible.value = !isMusicVisible.value;
          if (isMusicVisible.value) {
            btn.innerText = 'IT!';
            btn.style.color = 'var(--vp-c-brand)';
            btn.style.textDecorationColor = 'var(--vp-c-brand)';
            console.log('🎵 Music Easter Egg ACTIVE');
          } else {
            btn.innerText = 'it!';
            btn.style.color = '';
            btn.style.textDecorationColor = 'transparent';
            console.log('🔇 Music Easter Egg INACTIVE');
          }
        };
      }
    }
  };
  hookTagline();
  setTimeout(hookTagline, 1000);

  watch(
    isVisible,
    (visible) => {
      if (cycleInterval) clearInterval(cycleInterval);
      if (visible) {
        cycleInterval = setInterval(
          nextAnimation,
          SITE_CONSTANTS.SPLAT_CYCLE_TIME
        );
      }
      if (visible && !isMobileView.value) {
        animationId = requestAnimationFrame(render);
      }
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  if (cycleInterval) clearInterval(cycleInterval);
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
const onClick = () => {
  nextAnimation();
};
</script>

<template>
  <div v-show="isMobileView" class="HeroSplat fallback-image">
    <img src="/images/ava.webp" alt="Justme.dev Avatar" />
  </div>
  <div
    v-show="!isMobileView"
    class="HeroSplat image-src"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @click="onClick"
  >
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
  margin-top: 0.5rem;
  pointer-events: auto;
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

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
