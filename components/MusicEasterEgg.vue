<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useWindowSize, useVirtualList } from '@vueuse/core';
import { SITE_CONSTANTS } from '../.vitepress/constants';
import useMusic from '../.vitepress/theme/composables/useMusic';
import type { XMPlayer } from '../lib/audio/xm-player';
import type { MusicTrack } from '../data/music.data';

const {
  isMusicVisible,
  isPlaying,
  isSplatVisible,
  isShuffle,
  setAudioData,
  setPlaying,
  currentTrackIndex,
  tracks,
  toggleShuffle,
  setTrackIndex,
  nextTrack,
  prevTrack
} = useMusic();

const currentTrack = computed<MusicTrack | undefined>(
  () => tracks[currentTrackIndex.value]
);

const currentTrackUrl = computed(() => {
  const track = currentTrack.value;
  return track?.url || '';
});

const currentSongTitle = ref('');

const cleanTitle = (track?: MusicTrack, liveTitle?: string) => {
  let baseTitle = liveTitle || '';
  if (!baseTitle && track) {
    if (track.title) {
      baseTitle = track.title;
    } else {
      const raw = track.url || '';
      const filename = raw.split('/').pop() || raw;
      baseTitle = decodeURIComponent(filename)
        .replace(/\.xm$/i, '')
        .replace(/^\d+[-_.\s]+/, '')
        .replace(/^(justme\s*[-—]\s*)/i, '')
        .replace(/[-_]/g, ' ');
    }
  }
  return baseTitle || 'Unknown Track';
};

const formattedTitle = computed(() => {
  const track = currentTrack.value;
  const baseTitle = cleanTitle(track, currentSongTitle.value);
  if (!baseTitle) return '';

  if (track) {
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
  if (!track) return formattedTitle.value;
  const parts = [cleanTitle(track, currentSongTitle.value)];
  if (track.filename) parts.push(track.filename);
  if (track.channels) parts.push(`${track.channels} channels`);
  if (track.bpm) parts.push(`${track.bpm} BPM`);
  if (track.tracker) parts.push(track.tracker);
  return parts.join(' | ');
});

const { width: windowWidth } = useWindowSize();
const isMobileView = computed(
  () => windowWidth.value < SITE_CONSTANTS.MOBILE_BREAKPOINT
);

const volume = ref(0.7);
const isVolumeOpen = ref(false);
const progress = ref(0);
// Repeat: XM engine loops internally if repeat is on
const isRepeat = ref(false);

// Playlist drawer state
const isPlaylistOpen = ref(false);
const searchQuery = ref('');
const onlyFavorites = ref(false);
const favorites = ref<Set<string>>(new Set());

const FAVORITES_STORAGE_KEY = 'justme_music_favorites';

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        favorites.value = new Set(parsed);
      }
    }
  } catch {
    // Ignore localStorage errors (e.g. private mode or SSR)
  }
};

const saveFavorites = () => {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(Array.from(favorites.value))
    );
  } catch {
    // Ignore storage quota/permission errors
  }
};

const isCurrentFavorite = computed(() => {
  const fn = currentTrack.value?.filename;
  return fn ? favorites.value.has(fn) : false;
});

const toggleFavorite = (filename?: string) => {
  const target = filename || currentTrack.value?.filename;
  if (!target) return;
  if (favorites.value.has(target)) {
    favorites.value.delete(target);
  } else {
    favorites.value.add(target);
  }
  // Trigger reactivity by creating new Set instance
  favorites.value = new Set(favorites.value);
  saveFavorites();
};

// Filtered tracks for the playlist
interface FilteredTrackItem {
  track: MusicTrack;
  originalIndex: number;
  displayTitle: string;
}

const indexedTracks = computed<FilteredTrackItem[]>(() => {
  return tracks.map((track, originalIndex) => ({
    track,
    originalIndex,
    displayTitle: cleanTitle(track)
  }));
});

const filteredTracks = computed<FilteredTrackItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const favOnly = onlyFavorites.value;

  if (!query && !favOnly) {
    return indexedTracks.value;
  }

  return indexedTracks.value.filter(({ track, displayTitle }) => {
    if (favOnly && !favorites.value.has(track.filename)) {
      return false;
    }
    if (!query) return true;

    // Fast search matching title, filename, and clean title
    const matchTitle = (track.title || '').toLowerCase().includes(query);
    const matchDisplay = displayTitle.toLowerCase().includes(query);
    const matchFile = (track.filename || '').toLowerCase().includes(query);
    return matchTitle || matchDisplay || matchFile;
  });
});

// Virtualized list for 3000+ items
const {
  list: virtualList,
  containerProps,
  wrapperProps,
  scrollTo
} = useVirtualList(filteredTracks, {
  itemHeight: 46,
  overscan: 10
});

// When search query or favorites filter changes, reset scroll position so top items are rendered
watch([searchQuery, onlyFavorites], () => {
  if (containerProps.ref.value) {
    containerProps.ref.value.scrollTop = 0;
  }
  scrollTo(0);
});

const scrollToCurrentTrack = () => {
  if (!isPlaylistOpen.value) {
    isPlaylistOpen.value = true;
  }
  // Clear any search filter or fav filter if current track isn't visible
  const targetIndex = filteredTracks.value.findIndex(
    (item) => item.originalIndex === currentTrackIndex.value
  );

  if (targetIndex === -1) {
    searchQuery.value = '';
    onlyFavorites.value = false;
  }

  setTimeout(() => {
    const idx = filteredTracks.value.findIndex(
      (item) => item.originalIndex === currentTrackIndex.value
    );
    if (idx !== -1) {
      scrollTo(Math.max(0, idx - 2));
    }
  }, 50);
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationGain: GainNode | null = null;
let outputGain: GainNode | null = null;

const applyVolume = (vol: number) => {
  if (outputGain) outputGain.gain.value = Math.max(0, Math.min(1, vol));
};
let xmPlayer: XMPlayer | null = null;
let animationFrame: number;
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

let initPromise: Promise<void> | null = null;

const initAudio = () => {
  initPromise ??= doInitAudio();
  return initPromise;
};

const doInitAudio = async () => {
  audioContext = new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  )();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.55;

  animationGain = audioContext.createGain();
  animationGain.gain.value = 1.6;
  animationGain.connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  const { XMPlayer } = await import('../lib/audio/xm-player');
  xmPlayer = new XMPlayer({
    onEnded: () => {
      if (isRepeat.value) return;
      handleNext();
    }
  });

  const xmGain = xmPlayer.init(audioContext);
  if (xmGain) {
    xmGain.connect(animationGain);
    outputGain = audioContext.createGain();
    xmGain.connect(outputGain);
    outputGain.connect(audioContext.destination);
    applyVolume(volume.value);
  }
};

watch(isPlaying, (playing) => {
  cancelAnimationFrame(animationFrame);
  if (playing) {
    animationFrame = requestAnimationFrame(runAnalysis);
  }
});

const togglePlay = async () => {
  await initAudio();

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
      applyVolume(volume.value);
      xmPlayer.play();
      setPlaying(true);
    }
  }
};

const toggleRepeat = () => {
  isRepeat.value = !isRepeat.value;
};

const toggleVolume = () => {
  isVolumeOpen.value = !isVolumeOpen.value;
};

const togglePlaylist = () => {
  isPlaylistOpen.value = !isPlaylistOpen.value;
};

let skipTimeout: ReturnType<typeof setTimeout> | null = null;

const switchTrack = (advanceFn: () => void) => {
  if (skipTimeout) {
    clearTimeout(skipTimeout);
    skipTimeout = null;
  }

  const wasPlaying = isPlaying.value;
  if (xmPlayer?.isPlaying) xmPlayer.stop();

  advanceFn();
  progress.value = 0;
  currentSongTitle.value = '';

  if (wasPlaying) {
    skipTimeout = setTimeout(async () => {
      skipTimeout = null;
      await initAudio();
      if (xmPlayer) {
        await xmPlayer.loadUrl(currentTrackUrl.value);
        currentLoadedXmUrl = currentTrackUrl.value;
        currentSongTitle.value = xmPlayer.songTitle;
        applyVolume(volume.value);
        xmPlayer.play();
        setPlaying(true);
      }
    }, 100);
  }
};

const handleNext = () => switchTrack(nextTrack);
const handlePrev = () => switchTrack(prevTrack);

const selectTrack = (originalIndex: number) => {
  if (currentTrackIndex.value === originalIndex && isPlaying.value) return;
  switchTrack(() => setTrackIndex(originalIndex));
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
    applyVolume(newVol);
  }
});

// Close playlist on click outside or Escape
const containerRef = ref<HTMLElement | null>(null);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isPlaylistOpen.value) isPlaylistOpen.value = false;
    if (isVolumeOpen.value) isVolumeOpen.value = false;
  }
};

const handleDocumentClick = (e: MouseEvent) => {
  if (!isPlaylistOpen.value && !isVolumeOpen.value) return;
  const target = e.target as Node | null;
  if (containerRef.value && target && !containerRef.value.contains(target)) {
    isPlaylistOpen.value = false;
    isVolumeOpen.value = false;
  }
};

// Check for deep-linked ?track= query parameter on mount
onMounted(() => {
  loadFavorites();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', handleDocumentClick);

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get('track');
    if (trackParam) {
      const matchIdx = tracks.findIndex(
        (t) =>
          t.filename === trackParam ||
          t.filename.toLowerCase() === trackParam.toLowerCase()
      );
      if (matchIdx !== -1) {
        setTrackIndex(matchIdx);
      }
    }
  }
});

watch(isMusicVisible, (visible) => {
  if (!visible) {
    isPlaylistOpen.value = false;
    if (skipTimeout) {
      clearTimeout(skipTimeout);
      skipTimeout = null;
    }
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
      outputGain = null;
      xmPlayer = null;
      dataArray = null;
      currentLoadedXmUrl = '';
      currentSongTitle.value = '';
    }
    initPromise = null;
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('click', handleDocumentClick);
  }
  if (skipTimeout) {
    clearTimeout(skipTimeout);
    skipTimeout = null;
  }
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
    <div
      v-if="isMusicVisible && !isMobileView"
      ref="containerRef"
      class="music-mini-player-container"
    >
      <div class="music-mini-player">
        <div class="mini-controls">
          <!-- Previous Button -->
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

          <!-- Play / Pause Button -->
          <button
            class="mini-btn play"
            @click.stop="togglePlay"
            @mousedown.stop="initAudio"
            type="button"
            :title="isPlaying ? 'Pause' : 'Play'"
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

          <!-- Next Button -->
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

          <!-- Shuffle Toggle -->
          <button
            class="mini-btn shuffle-toggle"
            :class="{ active: isShuffle }"
            @click.stop="toggleShuffle"
            type="button"
            :title="isShuffle ? 'Shuffle: On' : 'Shuffle: Off'"
            :aria-pressed="isShuffle"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path
                d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.42-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.12z"
              />
            </svg>
          </button>

          <!-- Repeat Toggle -->
          <button
            class="mini-btn repeat-toggle"
            :class="{ active: isRepeat }"
            @click.stop="toggleRepeat"
            type="button"
            :title="isRepeat ? 'Repeat: on' : 'Repeat: off'"
            :aria-pressed="isRepeat"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path
                d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
              />
            </svg>
          </button>

          <!-- Favorite Toggle Button -->
          <button
            class="mini-btn fav-toggle"
            :class="{ active: isCurrentFavorite }"
            @click.stop="toggleFavorite()"
            type="button"
            :title="isCurrentFavorite ? 'Favorited' : 'Add to Favorites'"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              :fill="isCurrentFavorite ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </button>

          <!-- Volume Control Wrapper & Toggle -->
          <div class="volume-btn-wrap">
            <button
              class="mini-btn volume-toggle"
              :class="{ active: isVolumeOpen }"
              @click.stop="toggleVolume"
              type="button"
              title="Volume"
              :aria-expanded="isVolumeOpen"
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

            <!-- Vertical Volume Popover -->
            <Transition name="panel-pop">
              <div v-if="isVolumeOpen" class="mini-volume-dropdown" @click.stop>
                <div class="volume-slider-box">
                  <input
                    type="range"
                    v-model.number="volume"
                    min="0"
                    max="1"
                    step="0.01"
                    orient="vertical"
                    class="volume-range-vertical"
                    aria-label="Volume Control"
                  />
                </div>
                <span class="volume-percentage">
                  {{ Math.round(volume * 100) }}%
                </span>
              </div>
            </Transition>
          </div>
        </div>

        <div class="mini-content-area">
          <!-- Track Info Area always visible -->
          <div class="mini-info">
            <div class="track-meta">
              <div
                class="track-name-mini-wrap"
                @click.stop="scrollToCurrentTrack"
                title="Click to scroll to track in playlist"
              >
                <span
                  class="track-name-mini clickable"
                  :class="{ 'is-playing': isPlaying }"
                  :title="trackTooltip"
                >
                  {{ formattedTitle }}
                </span>
              </div>

              <!-- Playlist Dropdown Toggle Button (Right side) -->
              <button
                class="mini-btn playlist-toggle"
                :class="{ active: isPlaylistOpen }"
                @click.stop="togglePlaylist"
                type="button"
                :title="isPlaylistOpen ? 'Close Playlist' : 'Browse Playlist'"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path
                    d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                  />
                </svg>
              </button>
            </div>
            <div class="mini-progress-wrap" @click.stop="seek">
              <div
                class="mini-progress-bar"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Playlist Dropdown Panel -->
      <Transition name="panel-pop">
        <div v-if="isPlaylistOpen" class="mini-playlist-panel" @click.stop>
          <div class="playlist-header">
            <div class="search-input-wrap">
              <svg
                class="search-icon"
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search title, filename..."
                class="playlist-search-input"
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                @click="searchQuery = ''"
                type="button"
              >
                ✕
              </button>
            </div>

            <div class="playlist-header-actions">
              <button
                class="filter-fav-btn"
                :class="{ active: onlyFavorites }"
                @click="onlyFavorites = !onlyFavorites"
                type="button"
                :title="
                  onlyFavorites ? 'Show all tracks' : 'Show favorites only'
                "
              >
                ★
              </button>
              <span class="track-count-badge">
                {{ filteredTracks.length }}
              </span>
            </div>
          </div>

          <!-- Virtualized Playlist Items -->
          <div v-bind="containerProps" class="playlist-items-container">
            <div v-bind="wrapperProps">
              <div
                v-for="{ data: item, index } in virtualList"
                :key="index"
                class="playlist-item"
                :class="{
                  'is-active': item.originalIndex === currentTrackIndex
                }"
                @click="selectTrack(item.originalIndex)"
              >
                <div
                  class="item-fav-col"
                  @click.stop="toggleFavorite(item.track.filename)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    :fill="
                      favorites.has(item.track.filename)
                        ? 'var(--vp-c-brand)'
                        : 'none'
                    "
                    stroke="currentColor"
                    stroke-width="2"
                    class="item-star"
                    :class="{ starred: favorites.has(item.track.filename) }"
                  >
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                </div>

                <div class="item-content-col">
                  <div class="item-row-top">
                    <span class="item-title" :title="item.track.filename">
                      {{ item.displayTitle }}
                    </span>
                    <span
                      v-if="
                        item.originalIndex === currentTrackIndex && isPlaying
                      "
                      class="playing-pulse-badge"
                    >
                      PLAYING
                    </span>
                  </div>

                  <div class="item-row-meta">
                    <!-- Channels badge with audio channel icon -->
                    <span
                      v-if="item.track.channels"
                      class="meta-tag channels-tag"
                      :title="`${item.track.channels} channels`"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="10"
                        height="10"
                        fill="currentColor"
                      >
                        <path
                          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                        />
                      </svg>
                      {{ item.track.channels }}ch
                    </span>

                    <!-- BPM pill badge (3 numbers small) -->
                    <span
                      v-if="item.track.bpm"
                      class="meta-tag bpm-tag"
                      :title="`${item.track.bpm} BPM`"
                    >
                      {{ item.track.bpm }} BPM
                    </span>

                    <span class="meta-filename" :title="item.track.filename">
                      {{ item.track.filename }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                v-if="filteredTracks.length === 0"
                class="empty-search-state"
              >
                No matching tracks found
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.music-mini-player-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.music-mini-player {
  display: flex !important;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  background: rgba(var(--vp-c-bg-elv-rgb), 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  height: 32px;
  width: 320px !important;
  min-width: 320px !important;
  flex-shrink: 0 !important;
  transition: all var(--duration-normal) ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.mini-controls {
  display: flex;
  align-items: center;
  gap: 2px;
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

.mini-btn.fav-toggle.active {
  color: #ef4444;
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

.volume-btn-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-volume-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(var(--vp-c-bg-elv-rgb), 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 102;
  width: 34px;
}

.volume-slider-box {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-range-vertical {
  writing-mode: vertical-lr;
  direction: rtl;
  appearance: none;
  -webkit-appearance: none;
  width: 4px;
  height: 80px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  accent-color: var(--vp-c-brand);
}

.volume-range-vertical::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--vp-c-text-1);
  border: 2px solid var(--vp-c-brand);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.volume-range-vertical::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: var(--vp-c-brand);
}

.volume-percentage {
  font-size: 8px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  letter-spacing: 0.3px;
  white-space: nowrap;
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
  gap: 6px;
  overflow: hidden;
}

.track-name-mini-wrap {
  flex: 1;
  overflow: hidden;
  cursor: pointer;
  mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
}

.track-name-mini-wrap:hover .track-name-mini {
  color: var(--vp-c-brand);
}

.track-name-mini {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
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

/* Playlist Dropdown Panel */
.mini-playlist-panel {
  position: absolute;
  top: calc(100% + 8px);
  width: 380px;
  max-width: 90vw;
  background: rgba(var(--vp-c-bg-elv-rgb), 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 101;
}

.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: rgba(var(--vp-c-bg-soft-rgb, 0, 0, 0), 0.04);
}

.search-input-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.playlist-search-input {
  width: 100%;
  padding: 4px 24px 4px 26px;
  font-size: 11px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  outline: none;
  transition: border-color var(--duration-fast) ease;
}

.playlist-search-input:focus {
  border-color: var(--vp-c-brand);
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  font-size: 10px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 2px 4px;
}

.playlist-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-fav-btn {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.filter-fav-btn.active {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: #ef4444;
}

.track-count-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}

/* Playlist Virtual Items */
.playlist-items-container {
  height: 280px;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  height: 46px;
  padding: 0 10px;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--vp-c-divider-rgb, 128, 128, 128), 0.08);
  transition: background var(--duration-fast) ease;
}

.playlist-item:hover {
  background: var(--vp-c-bg-mute);
}

.playlist-item.is-active {
  background: var(--vp-c-brand-soft);
}

.item-fav-col {
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  transition: transform var(--duration-fast) ease;
}

.item-fav-col:hover {
  transform: scale(1.2);
}

.item-star.starred {
  color: #ef4444;
}

.item-content-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.item-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.item-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-item.is-active .item-title {
  color: var(--vp-c-brand);
}

.playing-pulse-badge {
  font-size: 8px;
  font-weight: 700;
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  padding: 1px 4px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.item-row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: var(--vp-c-text-3);
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  flex-shrink: 0;
}

.bpm-tag {
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--vp-c-brand);
}

.meta-filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
}

.empty-search-state {
  padding: 24px 12px;
  text-align: center;
  font-size: 11px;
  color: var(--vp-c-text-3);
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

.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: all var(--duration-normal) var(--ease-standard);
}

.panel-pop-enter-from,
.panel-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
