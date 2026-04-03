<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  pickRandomAnimation,
  animations,
  type SplatParticle,
  type AnimationContext,
  type SplatAnimation
} from '../../../lib/splat-animations';

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
const isPopping = ref(false);
const isCollapsing = ref(false);
const isManualMode = ref(false);
const isMobileView = ref(false);
const shiverIntensity = ref(0);
const boomOrigin = { x: 0, y: 0 };
let boomStartTime = 0;
let startTime = performance.now();
let cycleInterval: ReturnType<typeof setInterval>;

/**
 * Cycle to the next animation.
 * Accessible to both the auto-timer and the manual 'Next' button.
 */
const nextAnimation = () => {
  if (isPopping.value) return;

  currentAnimationIndex.value =
    (currentAnimationIndex.value + 1) % animations.length;
  const animation = animations[currentAnimationIndex.value];

  // Use a technical but friendly log
  console.log(
    `🎨 Animation: ${animation.name} ${isManualMode.value ? '[MANUAL]' : '[AUTO]'}`
  );

  const w = canvasRef.value?.width || 320;
  const h = canvasRef.value?.height || 320;

  animation.init(particles, w, h);
  currentAnimation.value = animation;
  startTime = performance.now();
};

onMounted(async () => {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d', { alpha: true });
  if (!ctx) return;

  // 1. Data Ingestion & Mobile Detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  try {
    const res = await fetch('/data/splats.json');
    if (res.ok) {
      let data = await res.json();

      if (isMobile) {
        data = data.filter((_: unknown, i: number) => i % 2 !== 0);
      }

      particles.push(
        ...data.map((p: SplatParticle) => ({
          ...p,
          x: p.ox,
          y: p.oy,
          vx: 0,
          vy: 0
        }))
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
    isMobileView.value =
      typeof window !== 'undefined' && window.innerWidth < 768;
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
    currentAnimation.value.init(particles, width, height);
    startTime = performance.now();
  }

  // 6. Physics Render Loop
  const render = (time: number) => {
    if (isMobileView.value) {
      animationId = requestAnimationFrame(render);
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
      mouseY: mouse.y
    };

    if (!currentAnimation.value) return;
    const anim = currentAnimation.value;

    // Cache some values outside the particle loop for performance
    const isPoppingVal = isPopping.value;
    const isCollapsingVal = isCollapsing.value;
    const shiverInt = shiverIntensity.value;
    const hasShiver = shiverInt > 0.05;
    const vT = time * 0.1; // for shiver
    const collapseT = isCollapsingVal ? time - boomStartTime : 0;
    const collapseSpiralT = collapseT - 1000;
    const collapseSpinFactor = 0.06 * Math.exp(-collapseSpiralT * 0.004);
    const releaseFactor = Math.min(collapseSpiralT / 800, 1.0);

    // Repulsion params
    const rRange = isMobile ? repulsionRange * 0.7 : repulsionRange;
    const hForce = isMobile ? hoverForce * 0.8 : hoverForce;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const baseTargetOx = p.ox * scale + offsetX;
      const baseTargetOy = p.oy * scale + offsetY;
      const effect = isPoppingVal
        ? { dx: 0, dy: 0 }
        : anim.apply(p, elapsed, animCtx, particles);
      const targetOx = baseTargetOx + effect.dx;
      const targetOy = baseTargetOy + effect.dy;
      const effectiveSpring =
        (isPoppingVal ? 0.2 : spring) * (effect.springScale ?? 1);

      const dxm = p.x - mouse.x;
      const dym = p.y - mouse.y;
      const distSq = dxm * dxm + dym * dym;

      let fx = 0;
      let fy = 0;

      // Optimized Repulsion (avoiding Sqrt if not needed)
      if (!isPoppingVal && distSq < rRange * rRange && distSq > 0.01) {
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

      // --- Singularity ---
      if (isCollapsingVal) {
        const bdx = p.x - boomOrigin.x;
        const bdy = p.y - boomOrigin.y;
        if (collapseT < 1000) {
          const pStart = (p.glitchSeed ?? 0) * 300;
          if (collapseT > pStart) {
            const pull = Math.min((collapseT - pStart) / 400, 1.0);
            fx += -bdx * 0.2 * pull;
            fy += -bdy * 0.2 * pull;
          }
        } else {
          fx += -bdy * collapseSpinFactor;
          fy += bdx * collapseSpinFactor;
          fx += -effectiveSpring * (p.x - targetOx) * (releaseFactor - 1);
          fy += -effectiveSpring * (p.y - targetOy) * (releaseFactor - 1);
        }
      }

      if (effect.nudgeVx) fx += effect.nudgeVx;
      if (effect.nudgeVy) fy += effect.nudgeVy;

      p.vx = (p.vx + fx) * damp;
      p.vy = (p.vy + fy) * damp;
      p.x += p.vx;
      p.y += p.vy;

      const brushColor = effect.colorOverride ?? p.color;
      const brush = getBrush(brushColor);
      const r = (brush.width / 2) * scale;
      ctx.drawImage(brush, p.x - r, p.y - r, r * 2, r * 2);
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
          if (isMobileView.value) {
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
          if (isManualMode.value) {
            btn.innerText = 'it!';
            btn.style.color = '';
            btn.style.textDecorationColor = 'transparent';
            isManualMode.value = false;
            cycleInterval = setInterval(nextAnimation, 10000);
            console.log('▶️ Auto-rotation re-enabled');
          } else {
            btn.innerText = 'IT!';
            btn.style.color = 'var(--vp-c-brand)';
            btn.style.textDecorationColor = 'var(--vp-c-brand)';
            isManualMode.value = true;
            if (cycleInterval) clearInterval(cycleInterval);
            console.log('⏹️ Auto-rotation disabled (Manual Mode ACTIVE)');
          }
        };
      }
    }
  };
  hookTagline();
  setTimeout(hookTagline, 1000);

  cycleInterval = setInterval(nextAnimation, 10000);
  requestAnimationFrame(render);
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
const onMouseDown = () => {
  isPopping.value = true;
};
const onMouseUp = () => {
  isPopping.value = false;
};
const onMouseLeave = () => {
  mouse.x = -9999;
  mouse.y = -9999;
  isPopping.value = false;
};
const onDoubleClick = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  boomOrigin.x = e.clientX - rect.left;
  boomOrigin.y = e.clientY - rect.top;
  boomStartTime = performance.now();
  isCollapsing.value = true;
  setTimeout(() => {
    isCollapsing.value = false;
  }, 2200);
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
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @dblclick="onDoubleClick"
  >
    <canvas ref="canvasRef"></canvas>
  </div>

  <!-- Manual Next Button (Easter Egg) -->
  <button
    v-if="isManualMode"
    class="next-btn"
    @click="nextAnimation"
    title="Next Animation"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  </button>
</template>

<style scoped>
.HeroSplat {
  width: 100%;
  height: 100%;
  position: absolute;
  margin-top: 5pt;
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
  padding-top: 90pt;
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

.next-btn {
  position: absolute;
  /* Position relative to the parent .image-container */
  bottom: 0;
  right: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.next-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--vp-c-brand);
  transform: scale(1.15) rotate(5deg);
  color: var(--vp-c-brand);
  box-shadow: 0 0 20px var(--vp-c-brand-soft);
}

.next-btn:active {
  transform: scale(0.95);
}

@media (max-width: 959px) {
  .next-btn {
    bottom: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
  }
}
</style>
