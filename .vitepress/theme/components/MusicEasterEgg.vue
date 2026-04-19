<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import useMusic from '../composables/useMusic';

const {
  isMusicVisible,
  isPlaying,
  setAudioData,
  setPlaying,
  currentTrackIndex,
  tracks,
  nextTrack,
  prevTrack
} = useMusic();

const volume = ref(0.7);
const progress = ref(0);
const audioRef = ref<HTMLAudioElement | null>(null);
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let animationFrame: number;

const initAudio = () => {
  if (audioContext || !audioRef.value) return;

  audioContext = new (
    window.AudioContext ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext
  )();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  source = audioContext.createMediaElementSource(audioRef.value);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const update = () => {
    if (isPlaying.value && analyser) {
      analyser.getByteFrequencyData(dataArray);
      setAudioData(new Uint8Array(dataArray));
    }
    animationFrame = requestAnimationFrame(update);
  };
  update();
};

const togglePlay = () => {
  if (!audioRef.value) return;

  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }

  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play();
  }
  setPlaying(!isPlaying.value);
};

const handleNext = () => {
  nextTrack();
  if (isPlaying.value) {
    setTimeout(() => audioRef.value?.play(), 100);
  }
};

const handlePrev = () => {
  prevTrack();
  if (isPlaying.value) {
    setTimeout(() => audioRef.value?.play(), 100);
  }
};

const onTimeUpdate = () => {
  if (audioRef.value) {
    progress.value =
      (audioRef.value.currentTime / audioRef.value.duration) * 100 || 0;
  }
};

const seek = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  if (audioRef.value) {
    audioRef.value.currentTime = percent * audioRef.value.duration;
  }
};

watch(volume, (newVol) => {
  if (audioRef.value) {
    audioRef.value.volume = newVol;
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  audioContext?.close();
});
</script>

<template>
  <Transition name="header-slide">
    <div v-if="isMusicVisible" class="music-mini-player">
      <audio
        ref="audioRef"
        :src="`/audio/${tracks[currentTrackIndex]}`"
        @timeupdate="onTimeUpdate"
        @ended="handleNext"
        crossorigin="anonymous"
      ></audio>

      <div class="mini-controls">
        <button
          class="mini-btn"
          @click.stop="handlePrev"
          type="button"
          title="Previous"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        <button
          class="mini-btn play"
          @click.stop="togglePlay"
          @mousedown.stop="initAudio"
          type="button"
        >
          <svg
            v-if="!isPlaying"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>

        <button
          class="mini-btn"
          @click.stop="handleNext"
          type="button"
          title="Next"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M16 6h2v12h-2zm-10.5 12 8.5-6-8.5-6z" />
          </svg>
        </button>
      </div>

      <div class="mini-info">
        <div class="track-meta">
          <div class="track-name-mini-wrap">
            <span class="track-name-mini" :class="{ 'is-playing': isPlaying }">
              JUSTME — {{ tracks[currentTrackIndex] }}
            </span>
          </div>
          <div class="mini-visualizer">
            <div
              v-for="i in 4"
              :key="i"
              class="mini-bar"
              :style="{
                animationDelay: `${i * 0.1}s`,
                animationPlayState: isPlaying ? 'running' : 'paused'
              }"
            ></div>
          </div>
        </div>
        <div class="mini-progress-wrap" @click.stop="seek">
          <div
            class="mini-progress-bar"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.music-mini-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  background: rgba(var(--vp-c-bg-elv-rgb), 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  height: 32px;
  max-width: 260px;
  transition: all 0.3s ease;
  /* Centering logic when in nav-bar slots */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

@media (max-width: 959px) {
  .music-mini-player {
    position: relative;
    left: 0;
    transform: none;
    max-width: 150px;
    margin: 0 10px;
  }
}

.mini-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-btn {
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.mini-btn:hover {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg-mute);
}

.mini-btn.play {
  color: var(--vp-c-text-1);
}

.mini-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 80px;
}

.track-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.track-name-mini-wrap {
  flex: 1;
  overflow: hidden;
  mask-image: linear-gradient(
    to right,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
}

.track-name-mini {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  padding-left: 100%;
}

.track-name-mini.is-playing {
  animation: mini-marquee 8s linear infinite;
}

@keyframes mini-marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

.mini-visualizer {
  display: flex;
  gap: 1.5px;
  height: 6px;
  align-items: flex-end;
}

.mini-bar {
  width: 1.5px;
  height: 100%;
  background: var(--vp-c-brand);
  animation: mini-bounce 0.6s ease-in-out infinite alternate;
}

@keyframes mini-bounce {
  from {
    height: 20%;
  }
  to {
    height: 100%;
  }
}

.mini-progress-wrap {
  height: 2px;
  background: var(--vp-c-divider);
  border-radius: 1px;
  cursor: pointer;
  overflow: hidden;
}

.mini-progress-bar {
  height: 100%;
  background: var(--vp-c-brand);
  transition: width 0.1s linear;
}

/* Transitions */
.header-slide-enter-active,
.header-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-slide-enter-from,
.header-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 768px) {
  .music-mini-player {
    display: none; /* Hide in header on mobile to save space, or maybe move to a different slot */
  }
}
</style>
