<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Matter from 'matter-js'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: Matter.Engine
let render: Matter.Render
let runner: Matter.Runner

onMounted(() => {
  if (!canvasRef.value) return

  // Module aliases
  const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events,
    Body = Matter.Body

  // Create an engine
  engine = Engine.create()
  engine.gravity.y = 0 // Zero gravity for drifting
  engine.gravity.x = 0

  // Create a renderer
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

  // Create bodies
  const bodies: Matter.Body[] = []
  // Green shades
  const colors = ['#4CAF50', '#8BC34A', '#66BB6A', '#A5D6A7', '#1B5E20', '#33691E']
  
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * window.innerWidth
    const y = Math.random() * window.innerHeight
    const size = Math.random() * 20 + 5
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    // Only circles for softer look
    const body = Bodies.circle(x, y, size, {
      render: { fillStyle: color, opacity: 0.2 }, // Low opacity
      restitution: 1, // Bounciness
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      plugin: {
        // Custom properties for pulse effect
        initialSize: size,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.0002 + Math.random() * 0.0004, // Very slow speed (approx 5x slower)
        pulseRange: 0.1 + Math.random() * 0.2, // 10-30% size variation
        currentScale: 1
      }
    })

    // Give random initial velocity
    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2, // -1 to 1
      y: (Math.random() - 0.5) * 2
    })
    
    bodies.push(body)
  }

  // Add walls to keep bodies in view
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

  // Handle collisions to prevent sticking/sliding along walls
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair
      // Check if one body is a wall and the other is a particle (circle)
      const wall = bodyA.label === 'wall' ? bodyA : bodyB.label === 'wall' ? bodyB : null
      const particle = bodyA.label !== 'wall' && bodyA.label !== 'Mouse Body' ? bodyA : bodyB.label !== 'wall' && bodyB.label !== 'Mouse Body' ? bodyB : null

      if (wall && particle) {
         // Add a small random impulse away from the wall to prevent sliding
         // Or just relying on restitution might not be enough at grazing angles
         // Let's manually ensure they bounce
         
         // Simple hack: if they hit a wall, give them a tiny random kick
         // But we need direction. 
         // Actually, let's just rely on increasing restitution for the collision?
         pair.restitution = 1.0 // Ensure max bounciness
         
         // If velocity is very low perpendicular to wall, bump it?
         // This is complex to calculate without normal.
         // Let's try forcing a minimal separation speed if needed, 
         // or just adding a tiny bit of random noise to velocity to break the "perfect slide"
         
         const speed = Matter.Vector.magnitude(particle.velocity)
         if (speed < 0.5) {
             // If moving very slow, give a nudge
             const forceMagnitude = 0.0005 * particle.mass
             Body.applyForce(particle, particle.position, { 
                 x: (Math.random() - 0.5) * forceMagnitude, 
                 y: (Math.random() - 0.5) * forceMagnitude 
             })
         }
      }
    })
  })

  // Add pulse animation loop
  Events.on(engine, 'beforeUpdate', (event) => {
    const time = engine.timing.timestamp
    
    bodies.forEach(body => {
      const plugin = body.plugin
      if (!plugin) return

      // Calculate target scale based on sine wave
      // Scale fluctuates around 1.0 (base size)
      const targetScale = 1 + Math.sin(time * plugin.pulseSpeed + plugin.pulsePhase) * plugin.pulseRange
      
      // Matter.js tracking of scale is relative to previous step, 
      // so we need to calculate the factor to apply to reach the target from current
      const scaleFactor = targetScale / plugin.currentScale
      
      Body.scale(body, scaleFactor, scaleFactor)
      plugin.currentScale = targetScale
    })
  })

  // Add mouse control (subtle)
  const mouse = Mouse.create(render.canvas)
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.05, // Very loose connection
      render: {
        visible: false
      }
    }
  })

  Composite.add(engine.world, mouseConstraint)

  // Keep the mouse in sync with rendering
  render.mouse = mouse

  // Run the renderer
  Render.run(render)

  // Create runner
  runner = Runner.create()
  Runner.run(runner, engine)
  
  // Handle resize with debounce
  let resizeTimeout: ReturnType<typeof setTimeout>
  
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (!canvasRef.value) return
      
      // Update canvas dimensions
      render.canvas.width = window.innerWidth
      render.canvas.height = window.innerHeight
      
      // Remove old walls
      Composite.remove(engine.world, [ground, ceiling, leftWall, rightWall])
      
      // Recreate walls with new dimensions
      const newGround = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions)
      const newCeiling = Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions)
      const newLeftWall = Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
      const newRightWall = Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
      
      // Update references
      ground = newGround
      ceiling = newCeiling
      leftWall = newLeftWall
      rightWall = newRightWall
      
      Composite.add(engine.world, [ground, ceiling, leftWall, rightWall])
      
      // No need to reset particles, they should stay (mostly) inside. 
      // If the window shrank significantly, some might be outside, but they will drift back or we can leave them.
    }, 200) // 200ms debounce
  }
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
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
  pointer-events: auto; /* Allow mouse interaction */
  background: transparent; /* Or a solid color if you want */
}

/* Ensure canvas takes full space */
canvas {
  display: block;
}
</style>
