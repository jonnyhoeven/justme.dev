<script setup lang="ts">
import { ref, onBeforeUnmount, watch, computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import useMusic from '../.vitepress/theme/composables/useMusic';
import { XMPlayer } from '../lib/audio/xm-player';
import type { MusicTrack } from '../data/music.data';

const {
  isMusicVisible,
  isPlaying,
  isSplatVisible,
  setAudioData,
  setPlaying,
  currentTrackIndex,
  tracks,
  nextTrack,
  prevTrack
} = useMusic();

const currentTrack = computed<MusicTrack | string | undefined>(
  () => tracks[currentTrackIndex.value]
);

const currentTrackUrl = computed(() => {
  const track = currentTrack.value;
  if (!track) return '';
  if (typeof track === 'string') {
    return track.startsWith('http://') || track.startsWith('https://')
      ? track
      : `/audio/${track}`;
  }
  return track.url || '';
});

const currentSongTitle = ref('');

const formattedTitle = computed(() => {
  const track = currentTrack.value;
  let baseTitle = currentSongTitle.value;
  if (!baseTitle && track) {
    if (typeof track === 'object' && track.title) {
      baseTitle = track.title;
    } else {
      const raw = typeof track === 'string' ? track : track.url || '';
      const filename = raw.split('/').pop() || raw;
      baseTitle = decodeURIComponent(filename)
        .replace(/\.xm$/i, '')
        .replace(/^\d+[-_.\s]+/, '')
        .replace(/^(justme\s*[-—]\s*)/i, '')
        .replace(/[-_]/g, ' ');
    }
  }
  if (!baseTitle) return '';

  if (typeof track === 'object') {
    const metaParts: string[] = [];
    if (track.channels) metaParts.push(`${track.channels}ch`);
    if (track.bpm) metaParts.push(`${track.bpm} BPM`);
    if (metaParts.length > 0) {
      return `${baseTitle} • ${metaParts.join(' • ')}`;
    }
  }

  return baseTitle;
});

const trackTooltip = computed(() => {
  const track = currentTrack.value;
  if (!track || typeof track !== 'object') return formattedTitle.value;
  const parts = [track.title];
  if (track.channels) parts.push(`${track.channels} channels`);
  if (track.bpm) parts.push(`${track.bpm} BPM`);
  if (track.tracker) parts.push(track.tracker);
  return parts.join(' | ');
});

const { width: windowWidth } = useWindowSize();
const isMobileView = computed(() => windowWidth.value < 768);

const volume = ref(0.7);
const isVolumeOpen = ref(false);
const progress = ref(0);

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationGain: GainNode | null = null;
let xmPlayer: XMPlayer | null = null;
let animationFrame: number;
// Reusable buffer — mutated in-place by getByteFrequencyData to avoid per-frame allocations.
let dataArray: Uint8Array | null = null;
let currentLoadedXmUrl = '';

const runAnalysis = () => {
  if (!isPlaying.value) return;

  if (isSplatVisible.value && analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    setAudioData(dataArray);
  }

  if (xmPlayer) {
    progress.value = xmPlayer.getProgress();
  }

  animationFrame = requestAnimationFrame(runAnalysis);
};

const initAudio = () => {
  if (audioContext) return;

  audioContext = new (
    window.AudioContext ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext
  )();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  animationGain = audioContext.createGain();
  animationGain.gain.value = 1.6;
  animationGain.connect(analyser);

  xmPlayer = new XMPlayer({
    onEnded: () => {
      handleNext();
    }
  });

  const xmGain = xmPlayer.init(audioContext);
  if (xmGain) {
    xmGain.connect(animationGain);
    xmGain.connect(audioContext.destination);
    xmPlayer.setVolume(volume.value);
  }

  dataArray = new Uint8Array(analyser.frequencyBinCount);
};

watch(isPlaying, (playing) => {
  cancelAnimationFrame(animationFrame);
  if (playing) {
    animationFrame = requestAnimationFrame(runAnalysis);
  }
});

const togglePlay = async () => {
  initAudio();

  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }

  if (isPlaying.value) {
    xmPlayer?.pause();
    setPlaying(false);
  } else {
    if (xmPlayer) {
      if (currentLoadedXmUrl !== currentTrackUrl.value) {
        await xmPlayer.loadUrl(currentTrackUrl.value);
        currentLoadedXmUrl = currentTrackUrl.value;
        currentSongTitle.value = xmPlayer.songTitle;
      }
      xmPlayer.setVolume(volume.value);
      xmPlayer.play();
      setPlaying(true);
    }
  }
};

const toggleVolume = () => {
  isVolumeOpen.value = !isVolumeOpen.value;
};

const handleNext = async () => {
  const wasPlaying = isPlaying.value;
  if (xmPlayer?.isPlaying) xmPlayer.stop();

  nextTrack();
  progress.value = 0;
  currentSongTitle.value = '';

  if (wasPlaying) {
    setTimeout(async () => {
      initAudio();
      if (xmPlayer) {
        await xmPlayer.loadUrl(currentTrackUrl.value);
        currentLoadedXmUrl = currentTrackUrl.value;
        currentSongTitle.value = xmPlayer.songTitle;
        xmPlayer.setVolume(volume.value);
        xmPlayer.play();
        setPlaying(true);
      }
    }, 100);
  }
};

const handlePrev = async () => {
  const wasPlaying = isPlaying.value;
  if (xmPlayer?.isPlaying) xmPlayer.stop();

  prevTrack();
  progress.value = 0;
  currentSongTitle.value = '';

  if (wasPlaying) {
    setTimeout(async () => {
      initAudio();
      if (xmPlayer) {
        await xmPlayer.loadUrl(currentTrackUrl.value);
        currentLoadedXmUrl = currentTrackUrl.value;
        currentSongTitle.value = xmPlayer.songTitle;
        xmPlayer.setVolume(volume.value);
        xmPlayer.play();
        setPlaying(true);
      }
    }, 100);
  }
};

const seek = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const percent = Math.max(
    0,
    Math.min(1, (e.clientX - rect.left) / rect.width)
  );
  if (xmPlayer) {
    xmPlayer.seek(percent);
    progress.value = percent * 100;
  }
};

watch(volume, (newVol) => {
  if (xmPlayer) {
    xmPlayer.setVolume(newVol);
  }
});

watch(isMusicVisible, (visible) => {
  if (!visible) {
    if (isPlaying.value) {
      setPlaying(false);
      xmPlayer?.stop();
    }
    isVolumeOpen.value = false;
    cancelAnimationFrame(animationFrame);
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      analyser = null;
      animationGain = null;
      xmPlayer = null;
      currentLoadedXmUrl = '';
      currentSongTitle.value = '';
    }
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  if (xmPlayer) {
    xmPlayer.stop();
    xmPlayer = null;
  }
  audioContext?.close();
  setPlaying(false);
});
</script>

<template>
  <Transition name="header-slide">
    <div v-if="isMusicVisible && !isMobileView" class="music-mini-player">
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
                  :title="trackTooltip"
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
  transform-origin: bottom;
  animation: mini-bounce 0.6s ease-in-out infinite alternate;
}

@keyframes mini-bounce {
  from {
    transform: scaleY(0.2);
  }
  to {
    transform: scaleY(1);
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
