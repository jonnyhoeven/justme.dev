<script setup lang="ts">
import { ref, onBeforeUnmount, watch, computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import useMusic from '../composables/useMusic';

const {
  isMusicVisible,
  isPlaying,
  setAudioData,
  setPlaying,
  currentTrackIndex,
  currentTime,
  tracks,
  setCurrentTime,
  nextTrack,
  prevTrack
} = useMusic();

const formattedTitle = computed(() => {
  const track = tracks[currentTrackIndex.value];
  if (!track) return '';
  // Remove "justme - " or "justme — " from the beginning
  const cleanName = track.replace(/^(justme\s*[-—]\s*)/i, '');
  // Remove file extension
  return cleanName.replace(/\.[^/.]+$/, '');
});

const { width: windowWidth } = useWindowSize();
const isMobileView = computed(() => windowWidth.value < 768);

const volume = ref(0.7);
const isVolumeOpen = ref(false);
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

  // Create a gain node specifically for the analyser to boost signal for animations
  const animationGain = audioContext.createGain();
  animationGain.gain.value = 1.6;

  source = audioContext.createMediaElementSource(audioRef.value);

  // Route 1: Boosted signal for animations
  source.connect(animationGain);
  animationGain.connect(analyser);

  // Route 2: Direct signal for user output (affected by audio element volume)
  source.connect(audioContext.destination);

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
    // Restore time if needed before playing
    if (audioRef.value.currentTime === 0 && currentTime.value > 0) {
      audioRef.value.currentTime = currentTime.value;
    }
    audioRef.value.play();
  }
  setPlaying(!isPlaying.value);
};

const toggleVolume = () => {
  isVolumeOpen.value = !isVolumeOpen.value;
};

const handleNext = () => {
  nextTrack();
  progress.value = 0;
  if (isPlaying.value) {
    setTimeout(() => audioRef.value?.play(), 100);
  }
};

const handlePrev = () => {
  prevTrack();
  progress.value = 0;
  if (isPlaying.value) {
    setTimeout(() => audioRef.value?.play(), 100);
  }
};

const onTimeUpdate = () => {
  if (audioRef.value) {
    const time = audioRef.value.currentTime;
    setCurrentTime(time);
    progress.value = (time / audioRef.value.duration) * 100 || 0;
  }
};

const onLoadedMetadata = () => {
  if (audioRef.value && currentTime.value > 0) {
    audioRef.value.currentTime = currentTime.value;
    progress.value = (currentTime.value / audioRef.value.duration) * 100 || 0;
  }
};

const seek = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  if (audioRef.value) {
    const targetTime = percent * audioRef.value.duration;
    audioRef.value.currentTime = targetTime;
    setCurrentTime(targetTime);
  }
};

watch(volume, (newVol) => {
  if (audioRef.value) {
    audioRef.value.volume = newVol;
  }
});

watch(isMusicVisible, (visible) => {
  if (!visible) {
    // If hidden, stop playing and cleanup
    if (isPlaying.value) {
      setPlaying(false);
      audioRef.value?.pause();
    }
    isVolumeOpen.value = false;
    cancelAnimationFrame(animationFrame);
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      analyser = null;
      source = null;
    }
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  audioContext?.close();
  setPlaying(false);
});
</script>

<template>
  <Transition name="header-slide">
    <div v-if="isMusicVisible && !isMobileView" class="music-mini-player">
      <audio
        ref="audioRef"
        :src="`/audio/${tracks[currentTrackIndex]}`"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
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

        <button
          class="mini-btn volume-toggle"
          :class="{ active: isVolumeOpen }"
          @click.stop="toggleVolume"
          type="button"
          title="Volume"
        >
          <svg
            v-if="volume === 0"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
          >
            <path
              d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
          >
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
        </button>
      </div>

      <div class="mini-content-area">
        <Transition name="fade-slide" mode="out-in">
          <!-- Track Info Area -->
          <div v-if="!isVolumeOpen" class="mini-info" key="info">
            <div class="track-meta">
              <div class="track-name-mini-wrap">
                <span
                  class="track-name-mini"
                  :class="{ 'is-playing': isPlaying }"
                >
                  {{ formattedTitle }}
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

          <!-- Volume Slider Area -->
          <div v-else class="mini-volume-overlay" key="volume">
            <input
              type="range"
              v-model.number="volume"
              min="0"
              max="1"
              step="0.01"
              class="volume-range-horizontal"
              aria-label="Volume Control"
            />
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.music-mini-player {
  display: flex !important;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  background: rgba(var(--vp-c-bg-elv-rgb), 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  height: 32px;
  width: 280px !important;
  min-width: 280px !important;
  flex-shrink: 0 !important;
  transition: all var(--duration-normal) ease;
  /* Centering logic when in nav-bar slots */
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

@media (max-width: 767px) {
  .music-mini-player {
    position: relative;
    left: 0;
    transform: none;
    width: 150px !important;
    min-width: 150px !important;
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
  transition: all var(--duration-fast) ease;
}

.mini-btn:hover,
.mini-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg-mute);
}

.mini-btn.play {
  color: var(--vp-c-text-1);
}

.mini-volume-wrap {
  position: relative;
}

.mini-content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.mini-volume-overlay {
  width: 100%;
  padding-right: 8px;
}

.volume-range-horizontal {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  accent-color: var(--vp-c-brand);
}

.volume-range-horizontal::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--vp-c-text-1);
  border: 2px solid var(--vp-c-brand);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.volume-range-horizontal::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: var(--vp-c-brand);
}

/* Fade Slide Transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all var(--duration-normal) var(--ease-standard);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.mini-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
}

.track-name-mini.is-playing {
  animation: mini-marquee 8s linear infinite;
}

@keyframes mini-marquee {
  0% {
    transform: translateX(0);
  }
  50% {
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
  transition: all 0.4s var(--ease-standard);
}

.header-slide-enter-from,
.header-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
