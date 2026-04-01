<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  pickRandomAnimation,
  getAnimation,
  type SplatParticle,
  type AnimationContext,
} from '../../../lib/splat-animations'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number
const particles: SplatParticle[] = []

// Physics parameters
const spring = 0.05
const damp = 0.8
const repulsionRange = 120
const hoverForce = 5

let mouse = { x: -9999, y: -9999 }
let width = 320
let height = 320
let currentAnimationIndex = 0
const currentAnimation = ref<any>(null)
let startTime = performance.now()

onMounted(async () => {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d', { alpha: true })
  if (!ctx) return

  // Load data
  try {
    const res = await fetch('/data/splats.json')
    if (res.ok) {
        const data = await res.json()
        particles.push(...data.map((p: any) => ({
          ...p,
          x: p.ox,
          y: p.oy,
          vx: 0,
          vy: 0,
        })))
    }
  } catch (e) {
    console.error("Failed to load splats data", e)
  }

  // ---- Animation system: pick one at random ----
  const { animation, index } = pickRandomAnimation()
  currentAnimationIndex = index
  currentAnimation.value = animation
  currentAnimation.value.init(particles)
  startTime = performance.now()

  // Pre-cache brushes for each unique color
  const brushCache = new Map<string, HTMLCanvasElement>()

  const getBrush = (color: string) => {
    if (brushCache.has(color)) return brushCache.get(color)!
    
    const size = 16
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctxC = c.getContext('2d')!
    
    const grad = ctxC.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
    
    grad.addColorStop(0, `rgba(${color}, 1.0)`)
    grad.addColorStop(0.4, `rgba(${color}, 0.8)`)
    grad.addColorStop(0.8, `rgba(${color}, 0.2)`)
    grad.addColorStop(1, `rgba(${color}, 0.0)`)
    
    ctxC.fillStyle = grad
    ctxC.fillRect(0,0,size,size)
    brushCache.set(color, c)
    return c
  }

  const resize = () => {
    if (!canvasRef.value) return
    const rect = canvasRef.value.parentElement?.getBoundingClientRect()
    if (rect && rect.width > 0) {
      width = Math.floor(rect.width)
      height = Math.floor(rect.height)
      canvasRef.value.width = width
      canvasRef.value.height = height
    }
  }

  window.addEventListener('resize', resize)
  resize()
  
  // Set initial positions — scrambled randomly for the entrance
  const initialScale = Math.min(width, height) / 320
  const initialOffsetX = (width - 320 * initialScale) / 2
  const initialOffsetY = (height - 320 * initialScale) / 2
  
  particles.forEach(p => {
      p.x = (Math.random() * 320) * initialScale + initialOffsetX
      p.y = (Math.random() * 320) * initialScale + initialOffsetY
  })

  const render = () => {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    
    const scale = Math.min(width, height) / 320
    const offsetX = (width - 320 * scale) / 2
    const offsetY = (height - 320 * scale) / 2

    const elapsed = performance.now() - startTime

    const animCtx: AnimationContext = {
      width,
      height,
      scale,
      offsetX,
      offsetY,
      mouseX: mouse.x,
      mouseY: mouse.y,
    }

    if (!currentAnimation.value) return

    particles.forEach(p => {
      // Base spring target in screen space
      const baseTargetOx = p.ox * scale + offsetX
      const baseTargetOy = p.oy * scale + offsetY

      // Apply the chosen animation effect
      const effect = currentAnimation.value.apply(p, elapsed, animCtx)

      const targetOx = baseTargetOx + effect.dx
      const targetOy = baseTargetOy + effect.dy
      const effectiveSpring = spring * (effect.springScale ?? 1)
      
      const dx = p.x - mouse.x
      const dy = p.y - mouse.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      
      let fx = 0
      let fy = 0
      
      // Repulsion Force
      if (dist < repulsionRange && dist > 0.1) {
        const force = (repulsionRange - dist) / repulsionRange
        fx += (dx / dist) * force * hoverForce / p.mass
        fy += (dy / dist) * force * hoverForce / p.mass
      }
      
      // Spring force (Hooke's law) with animation-modulated constant
      fx += -effectiveSpring * (p.x - targetOx)
      fy += -effectiveSpring * (p.y - targetOy)

      // Apply velocity nudges from animation (e.g. floating outliers)
      if (effect.nudgeVx) fx += effect.nudgeVx
      if (effect.nudgeVy) fy += effect.nudgeVy
      
      // Integrate
      p.vx = (p.vx + fx) * damp
      p.vy = (p.vy + fy) * damp
      
      p.x += p.vx
      p.y += p.vy
      
      // Draw Splat — use colour override if the animation provides one
      const brushColor = effect.colorOverride ?? p.color
      const brush = getBrush(brushColor)
      const r = (brush.width / 2) * scale
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(brush, p.x - r, p.y - r, r * 2, r * 2)
    })
    
    animationId = requestAnimationFrame(render)
  }
  
  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
})

const onMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
}

const onMouseLeave = () => {
  mouse.x = -9999
  mouse.y = -9999
}

const onClick = () => {
  currentAnimationIndex++
  const animation = getAnimation(currentAnimationIndex)
  animation.init(particles)
  currentAnimation.value = animation
  startTime = performance.now()
  console.log(`🎨 Switched animation: ${animation.name}`)
}

</script>

<template>
  <div class="HeroSplat image-src" @mousemove="onMouseMove" @mouseleave="onMouseLeave" @click="onClick">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.HeroSplat {
  width: 100%;
  height: 100%;
  position: absolute;
  /* Move down slightly from header on normal browsers */
  margin-top: 5pt;
  /* Allow canvas interactions */
  pointer-events: auto;
}

@media (max-width: 959px) {
  .HeroSplat {
    /* Significantly more padding/margin on mobile */
    margin-top: 24px;
  }
}


canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
