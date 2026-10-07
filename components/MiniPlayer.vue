<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
  nextTick
} from 'vue';
import { useWindowSize, useVirtualList, useResizeObserver } from '@vueuse/core';
import { SITE_CONSTANTS } from '../.vitepress/constants';
import useMusic from '../.vitepress/theme/composables/useMusic';
import type { MusicTrack } from '../data/music.data';

const {
  isMusicVisible,
  isPlaying,
  isShuffle,
  currentTrackIndex,
  currentTrack,
  progress,
  volume,
  isRepeat,
  tracks,
  liveSongTitle,
  togglePlay,
  toggleShuffle,
  toggleRepeat,
  setTrackIndex,
  pickRandomInitialTrack,
  selectTrack,
  handleNext,
  handlePrev,
  seek: seekPlayer,
  setVolume,
  initAudio
} = useMusic();

const currentSongTitle = liveSongTitle;

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

// Ping-pong marquee: only scroll when the title is wider than its box.
const nameWrapRef = ref<HTMLElement | null>(null);
const nameRef = ref<HTMLElement | null>(null);
const marqueeShift = ref(0);

const MARQUEE_SPEED_PX_PER_S = 35;

const measureMarquee = () => {
  const wrap = nameWrapRef.value;
  const name = nameRef.value;
  if (!wrap || !name) return;
  marqueeShift.value = Math.max(0, name.offsetWidth - wrap.clientWidth);
};

const marqueeStyle = computed(() => ({
  '--marquee-shift': `${marqueeShift.value}px`,
  '--marquee-duration': `${Math.max(
    4,
    marqueeShift.value / MARQUEE_SPEED_PX_PER_S + 2
  )}s`
}));

useResizeObserver(nameWrapRef, measureMarquee);
useResizeObserver(nameRef, measureMarquee);
watch(formattedTitle, () => nextTick(measureMarquee));

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
  itemHeight: 48,
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

// The panel is v-if'd, so its list remounts at the top on every open. While
// playing, jump to the current track (e.g. the random one picked on load).
watch(isPlaylistOpen, (open) => {
  if (open && isPlaying.value) scrollToCurrentTrack();
});

let volumeBeforeMute = 0.7;
const toggleMute = () => {
  if (volume.value > 0) {
    volumeBeforeMute = volume.value;
    setVolume(0);
  } else {
    setVolume(volumeBeforeMute);
  }
};

const togglePlaylist = () => {
  isPlaylistOpen.value = !isPlaylistOpen.value;
};

const seek = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const percent = Math.max(
    0,
    Math.min(1, (e.clientX - rect.left) / rect.width)
  );
  seekPlayer(percent);
};

// Close playlist on click outside or Escape
const containerRef = ref<HTMLElement | null>(null);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isPlaylistOpen.value) isPlaylistOpen.value = false;
  }
};

const handleDocumentClick = (e: MouseEvent) => {
  if (!isPlaylistOpen.value) return;
  const target = e.target as Node | null;
  if (containerRef.value && target && !containerRef.value.contains(target)) {
    isPlaylistOpen.value = false;
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
    const matchIdx = trackParam
      ? tracks.findIndex(
          (t) =>
            t.filename === trackParam ||
            t.filename.toLowerCase() === trackParam.toLowerCase()
        )
      : -1;
    if (matchIdx !== -1) {
      setTrackIndex(matchIdx);
    } else {
      // No (valid) deep link: start on a random track.
      pickRandomInitialTrack();
    }
  }
});

watch(isMusicVisible, (visible) => {
  if (!visible) {
    isPlaylistOpen.value = false;
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('click', handleDocumentClick);
  }
});
</script>

<template>
  <div
    v-if="!isMobileView"
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
            <!-- Not yet a favorite: "+" inside the heart signals "add". The
                 playlist rows keep the plain heart. -->
            <path
              v-if="!isCurrentFavorite"
              d="M12 8.5v6M9 11.5h6"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <!-- Inline volume: speaker button mutes/unmutes, slider sets level -->
        <div class="volume-inline">
          <button
            class="mini-btn volume-toggle"
            @click.stop="toggleMute"
            type="button"
            :title="volume === 0 ? 'Unmute' : 'Mute'"
            :aria-pressed="volume === 0"
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
          <input
            type="range"
            :value="volume"
            @input="
              setVolume(Number(($event.target as HTMLInputElement).value))
            "
            @click.stop
            min="0"
            max="1"
            step="0.01"
            class="volume-range"
            :title="`Volume ${Math.round(volume * 100)}%`"
            aria-label="Volume"
          />
        </div>
      </div>

      <div class="mini-content-area">
        <!-- Track Info Area always visible -->
        <div class="mini-info">
          <div class="track-meta">
            <div
              ref="nameWrapRef"
              class="track-name-mini-wrap"
              @click.stop="scrollToCurrentTrack"
              title="Click to scroll to track in playlist"
            >
              <span
                ref="nameRef"
                class="track-name-mini clickable"
                :class="{
                  'is-scrolling': marqueeShift > 0,
                  'is-paused': !isPlaying
                }"
                :style="marqueeStyle"
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
              :title="onlyFavorites ? 'Show all tracks' : 'Show favorites only'"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                :fill="onlyFavorites ? '#ef4444' : 'none'"
                :stroke="onlyFavorites ? '#ef4444' : 'currentColor'"
                stroke-width="2"
                class="filter-heart-icon"
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </button>
            <span class="track-count-badge">
              {{ filteredTracks.length }}
            </span>
            <a
              href="/blog/tracker"
              class="full-player-link-btn"
              title="Open Full Tracker Player"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
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
                :title="
                  favorites.has(item.track.filename)
                    ? 'Remove from Favorites'
                    : 'Add to Favorites'
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  :fill="
                    favorites.has(item.track.filename) ? '#ef4444' : 'none'
                  "
                  :stroke="
                    favorites.has(item.track.filename)
                      ? '#ef4444'
                      : 'var(--vp-c-text-3)'
                  "
                  stroke-width="2"
                  class="item-heart"
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

                  <div class="item-badges-right">
                    <!-- Channels badge with audio channel icon -->
                    <span
                      v-if="item.track.channels"
                      class="meta-tag channels-tag"
                      :title="`${item.track.channels} channels`"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="9"
                        height="9"
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
                  </div>
                </div>

                <div class="item-row-meta">
                  <span class="meta-filename" :title="item.track.filename">
                    {{ item.track.filename }}
                  </span>
                  <span
                    v-if="item.track.tracker"
                    class="meta-tag tracker-tag"
                    :title="item.track.tracker"
                  >
                    {{ item.track.tracker }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="filteredTracks.length === 0" class="empty-search-state">
              No matching tracks found
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
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
  width: 440px !important;
  min-width: 440px !important;
  flex-shrink: 0 !important;
  transition: all var(--duration-normal) ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  /* backdrop-filter makes the bar its own stacking context, so the volume
     popover's z-index only counts inside it; lift the bar above the playlist
     panel (z-index 101) instead. */
  position: relative;
  z-index: 102;
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

.volume-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
}

.volume-range {
  appearance: none;
  -webkit-appearance: none;
  width: 64px;
  height: 4px;
  flex-shrink: 0;
  background: var(--vp-c-divider);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  accent-color: var(--vp-c-brand);
}

.volume-range::-webkit-slider-thumb {
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

.volume-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: var(--vp-c-brand);
}

.volume-range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: var(--vp-c-text-1);
  border: 2px solid var(--vp-c-brand);
  border-radius: 50%;
  cursor: pointer;
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
    black 12px,
    black calc(100% - 12px),
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 12px,
    black calc(100% - 12px),
    transparent
  );
}

.track-name-mini-wrap:hover .track-name-mini {
  color: var(--vp-c-brand);
}

.track-name-mini {
  display: inline-block;
  /* Side padding keeps the first/last letters clear of the edge fade. */
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.2px;
  opacity: 0.95;
}

.track-name-mini.is-scrolling {
  animation: mini-marquee var(--marquee-duration, 8s) ease-in-out infinite
    alternate;
}

.track-name-mini.is-scrolling.is-paused {
  animation-play-state: paused;
}

@keyframes mini-marquee {
  0%,
  15% {
    transform: translateX(0);
  }
  85%,
  100% {
    transform: translateX(calc(-1 * var(--marquee-shift, 0px)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .track-name-mini.is-scrolling {
    animation: none;
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
  width: 440px;
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

.full-player-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  border-radius: 6px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.full-player-link-btn:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* Playlist Virtual Items */
.playlist-items-container {
  height: 280px;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 10px;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--vp-c-divider-rgb, 128, 128, 128), 0.08);
  border-left: 3px solid transparent;
  transition: all var(--duration-fast) ease;
}

.playlist-item:hover {
  background: var(--vp-c-bg-mute);
}

.playlist-item.is-active {
  background: rgba(var(--vp-c-brand-rgb), 0.12);
  border-left-color: var(--vp-c-brand);
}

.item-fav-col {
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) ease;
}

.item-fav-col:hover {
  transform: scale(1.15);
}

.item-heart {
  transition: all var(--duration-fast) ease;
}

.item-heart.starred {
  color: #ef4444;
}

.item-content-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.item-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.playlist-item.is-active .item-title {
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.item-badges-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.item-row-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: var(--vp-c-text-2);
  width: 100%;
}

.meta-filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--vp-c-text-2);
  font-size: 9.5px;
  flex: 1;
  min-width: 0;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 8.5px;
  padding: 0 4px;
  height: 16px;
  line-height: 16px;
  border-radius: 3px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.tracker-tag {
  font-weight: 500;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bpm-tag {
  font-weight: 500;
  letter-spacing: 0.2px;
  color: var(--vp-c-text-2);
}

.empty-search-state {
  padding: 24px 12px;
  text-align: center;
  font-size: 11px;
  color: var(--vp-c-text-2);
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
