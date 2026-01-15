<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Matter from 'matter-js'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: Matter.Engine
let render: Matter.Render
let runner: Matter.Runner
let handleScroll: () => void
let handleResize: () => void

onMounted(() => {
  if (!canvasRef.value) return

  const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Body = Matter.Body

  engine = Engine.create()
  engine.gravity.y = 0
  engine.gravity.x = 0

  render = Render.create({
    canvas: canvasRef.value,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      background: 'transparent',
      wireframes: false,
      pixelRatio: window.devicePixelRatio
    }
  })

  const bodies: Matter.Body[] = []
  const colors = ['#4c8f4eff', '#4e7e44ff', '#66BB6A', '#1a5357ff', '#423c74ff', '#0d2404ff']
  
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * window.innerWidth
    const y = Math.random() * window.innerHeight
    const size = Math.random() * 20 + 5
    const color = colors[Math.floor(Math.random() * colors.length)]
    

    const body = Bodies.circle(x, y, size, {
      render: { fillStyle: color, opacity: 0.035 },
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      plugin: {
        initialSize: size,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.0002 + Math.random() * 0.0004,
        pulseRange: 0.1 + Math.random() * 0.2,
        currentScale: 1
      }
    })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    })
    
    bodies.push(body)
  }

  const wallOptions = { 
    isStatic: true, 
    render: { visible: false },
    restitution: 1,
    friction: 0,
    label: 'wall'
  }
  
  let ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions)
  let ceiling = Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions)
  let leftWall = Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
  let rightWall = Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
  
  Composite.add(engine.world, [...bodies, ground, ceiling, leftWall, rightWall])

  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair
      const wall = bodyA.label === 'wall' ? bodyA : bodyB.label === 'wall' ? bodyB : null
      const particle = bodyA.label !== 'wall' && bodyA.label !== 'Mouse Body' ? bodyA : bodyB.label !== 'wall' && bodyB.label !== 'Mouse Body' ? bodyB : null

      if (wall && particle) {
         pair.restitution = 1.0
         
         const speed = Matter.Vector.magnitude(particle.velocity)
         if (speed < 0.5) {
             const forceMagnitude = 0.0005 * particle.mass
             Body.applyForce(particle, particle.position, { 
                 x: (Math.random() - 0.5) * forceMagnitude, 
                 y: (Math.random() - 0.5) * forceMagnitude 
             })
         }
      }
    })
  })

  Events.on(engine, 'beforeUpdate', (event) => {
    const time = engine.timing.timestamp
    
    bodies.forEach(body => {
      const plugin = body.plugin
      if (!plugin) return

      const targetScale = 1 + Math.sin(time * plugin.pulseSpeed + plugin.pulsePhase) * plugin.pulseRange
      
      const scaleFactor = targetScale / plugin.currentScale
      
      Body.scale(body, scaleFactor, scaleFactor)
      plugin.currentScale = targetScale
    })
  })

  
  Render.run(render)

  runner = Runner.create()
  Runner.run(runner, engine)
  
  let resizeTimeout: ReturnType<typeof setTimeout>
  
  handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (!canvasRef.value) return
      
      render.canvas.width = window.innerWidth
      render.canvas.height = window.innerHeight
      
      Composite.remove(engine.world, [ground, ceiling, leftWall, rightWall])
      
      const newGround = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions)
      const newCeiling = Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions)
      const newLeftWall = Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
      const newRightWall = Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
      
      ground = newGround
      ceiling = newCeiling
      leftWall = newLeftWall
      rightWall = newRightWall
      
      Composite.add(engine.world, [ground, ceiling, leftWall, rightWall])
      
    }, 200)
  }
  
  window.addEventListener('resize', handleResize)

  let lastScrollY = window.scrollY
  handleScroll = () => {
    const currentScrollY = window.scrollY
    const delta = currentScrollY - lastScrollY
    lastScrollY = currentScrollY
    
    const forceMagnitude = delta * 0.000005

    bodies.forEach(body => {
      if (!body.isStatic) {
        Body.applyForce(body, body.position, { x: 0, y: -forceMagnitude })
      }
    })
  }

  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (handleScroll) window.removeEventListener('scroll', handleScroll)
  
  if (render) {
    Render.stop(render)
    if (render.canvas) render.canvas.remove()
  }
  if (runner) {
    Runner.stop(runner)
  }
  if (engine) {
    Matter.Engine.clear(engine)
  }
})

</script>

<template>
  <div class="matter-background">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.matter-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
  background: transparent;
  filter: blur(1px);
}

canvas {
  display: block;
}
</style>
