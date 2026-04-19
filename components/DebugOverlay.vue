<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  particleCount: number;
  activeAnimation: string;
}>();

const fps = ref(0);
const frameTime = ref(0);
const gpuInfo = ref('Detecting...');
const isVisible = ref(false);

let frameCount = 0;
let lastTime = performance.now();

const updateMetrics = (time: number) => {
  frameCount++;
  const delta = time - lastTime;

  if (delta >= 1000) {
    fps.value = Math.round((frameCount * 1000) / delta);
    frameTime.value = Number((delta / frameCount).toFixed(2));
    frameCount = 0;
    lastTime = time;
  }

  requestAnimationFrame(updateMetrics);
};

onMounted(() => {
  // Check for debug mode in URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('debug') || localStorage.getItem('debug_mode') === 'true') {
    isVisible.value = true;
  }

  // Detect GPU
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuInfo.value =
          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU';
      } else {
        gpuInfo.value = 'GPU Info Blocked';
      }
    } else {
      gpuInfo.value = 'No WebGL Support';
    }
  } catch {
    gpuInfo.value = 'Failed to Detect GPU';
  }

  requestAnimationFrame(updateMetrics);
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="DebugOverlay">
      <div class="debug-header">
        <span class="pulse-dot"></span>
        <span class="title">SYSTEM DIAGNOSTICS</span>
        <button class="close-btn" @click="isVisible = false">&times;</button>
      </div>

      <div class="metrics-grid">
        <div class="metric">
          <label>Performance</label>
          <div class="value-container">
            <span class="value" :class="{ 'low-fps': fps < 30 }">{{
              fps
            }}</span>
            <span class="unit">FPS</span>
          </div>
          <div class="sub-value">{{ frameTime }}ms / frame</div>
        </div>

        <div class="metric">
          <label>Simulation</label>
          <div class="value-container">
            <span class="value">{{ particleCount }}</span>
            <span class="unit">SPLATZ</span>
          </div>
          <div class="sub-value">{{ activeAnimation }}</div>
        </div>
      </div>

      <div class="gpu-info">
        <label>Renderer</label>
        <div class="gpu-text">{{ gpuInfo }}</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.DebugOverlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 280px;
  background: rgba(10, 10, 12, 0.85);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Monaco', 'Consolas', monospace;
  color: #fff;
  z-index: 9999;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  user-select: none;
  pointer-events: auto;
}

.debug-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #00ff88;
  border-radius: 50%;
  margin-right: 10px;
  box-shadow: 0 0 8px #00ff88;
  animation: pulse 2s infinite;
}

.title {
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
}

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.metric label {
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.value-container {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.value {
  font-size: 24px;
  font-weight: 700;
  color: #00ff88;
}

.value.low-fps {
  color: #ff4444;
}

.unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.sub-value {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gpu-info {
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.gpu-info label {
  display: block;
  font-size: 8px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 4px;
}

.gpu-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  word-break: break-all;
  line-height: 1.4;
}

.footer-note {
  margin-top: 16px;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
