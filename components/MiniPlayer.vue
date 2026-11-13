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
import { useResizeObserver } from '@vueuse/core';
import useMusic from '../.vitepress/theme/composables/useMusic';
import usePlaylist from '../.vitepress/theme/composables/usePlaylist';
import IconHeart from './icons/IconHeart.vue';
import IconTransport from './icons/IconTransport.vue';
import { seekKeyStep } from '../lib/player-a11y';

const {
  isPlaying,
  isShuffle,
  currentTrackIndex,
  currentTrack,
  progress,
  volume,
  isRepeat,
  catalogLoaded,
  catalogFailed,
  ensureCatalog,
  liveSongTitle,
  favorites,
  isCurrentFavorite,
  initMusicOnce,
  toggleFavorite,
  cleanTitle,
  togglePlay,
  toggleShuffle,
  toggleRepeat,
  selectTrack,
  handleNext,
  handlePrev,
  seek: seekPlayer,
  setVolume,
  initAudio
} = useMusic();

const currentSongTitle = liveSongTitle;

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

// Playlist drawer state
const isPlaylistOpen = ref(false);

// Filtered tracks + virtualized list for 3000+ items
const {
  searchQuery,
  onlyFavorites,
  filteredTracks,
  virtualList,
  containerProps,
  wrapperProps,
  scrollTo
} = usePlaylist({ itemHeight: 48, overscan: 10 });

const scrollToCurrentTrack = async () => {
  if (!isPlaylistOpen.value) {
    isPlaylistOpen.value = true;
  }
  await ensureCatalog();
  // Clear any search filter or fav filter if current track isn't visible
  const targetIndex = filteredTracks.value.findIndex(
    (item) => item.originalIndex === currentTrackIndex.value
  );

  if (targetIndex === -1) {
    searchQuery.value = '';
    onlyFavorites.value = false;
  }

  await nextTick();
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
  if (open && isPlaying.value) {
    void scrollToCurrentTrack();
  } else if (open) {
    void ensureCatalog();
  }
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

const canSeek = computed(() => !!currentTrack.value);
const seekPercent = computed(() => Math.round(progress.value));

const seekByKey = (e: KeyboardEvent) => {
  if (!canSeek.value || e.altKey || e.ctrlKey || e.metaKey) return;
  const next = seekKeyStep(e.key, progress.value);
  if (next === null) return;
  e.preventDefault();
  e.stopPropagation();
  seekPlayer(next / 100);
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
  initMusicOnce();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('click', handleDocumentClick);
  }
});
</script>

<template>
  <div ref="containerRef" class="music-mini-player-container">
    <div class="music-mini-player">
      <div class="mini-controls">
        <!-- Previous Button -->
        <button
          class="mini-btn"
          @click.stop="handlePrev"
          type="button"
          title="Previous"
        >
          <IconTransport name="prev" :size="14" />
        </button>

        <!-- Play / Pause Button -->
        <button
          class="mini-btn play"
          @click.stop="togglePlay"
          @mousedown.stop="initAudio"
          type="button"
          :title="isPlaying ? 'Pause' : 'Play'"
        >
          <IconTransport :name="isPlaying ? 'pause' : 'play'" :size="18" />
        </button>

        <!-- Next Button -->
        <button
          class="mini-btn"
          @click.stop="handleNext"
          type="button"
          title="Next"
        >
          <IconTransport name="next" :size="14" />
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
          <IconTransport name="shuffle" :size="14" />
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
          <IconTransport name="repeat" :size="14" />
        </button>

        <!-- Favorite Toggle Button -->
        <button
          class="mini-btn fav-toggle"
          :class="{ active: isCurrentFavorite }"
          @click.stop="toggleFavorite()"
          type="button"
          :title="isCurrentFavorite ? 'Favorited' : 'Add to Favorites'"
          :aria-pressed="isCurrentFavorite"
        >
          <IconHeart
            :filled="isCurrentFavorite"
            :plus="!isCurrentFavorite"
            :size="13"
          />
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
            <IconTransport
              :name="volume === 0 ? 'mute' : 'volume'"
              :size="14"
            />
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
            <div ref="nameWrapRef" class="track-name-mini-wrap">
              <button
                type="button"
                class="track-name-mini-btn"
                @click.stop="scrollToCurrentTrack"
                title="Show current track in playlist"
                :aria-label="`Show ${formattedTitle || 'current track'} in playlist`"
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
              </button>
            </div>

            <a
              href="/blog/tracker"
              class="mini-btn full-player-link"
              title="Open Full Tracker Player"
              aria-label="Open Full Tracker Player"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

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
          <div
            class="mini-progress-wrap"
            role="slider"
            :tabindex="canSeek ? 0 : -1"
            aria-label="Seek"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="seekPercent"
            :aria-valuetext="`${seekPercent} percent`"
            :aria-disabled="!canSeek"
            @click.stop="seek"
            @keydown="seekByKey"
          >
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
              aria-label="Search playlist"
            />
            <button
              v-if="searchQuery"
              class="clear-search-btn"
              @click="searchQuery = ''"
              type="button"
              aria-label="Clear search"
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
              <IconHeart
                :filled="onlyFavorites"
                accent
                :size="12"
                class="filter-heart-icon"
              />
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
              v-for="{ data: item } in virtualList"
              :key="item.originalIndex"
              class="playlist-item"
              :class="{
                'is-active': item.originalIndex === currentTrackIndex
              }"
            >
              <button
                type="button"
                class="item-fav-col"
                @click.stop="toggleFavorite(item.track.filename)"
                :aria-pressed="favorites.has(item.track.filename)"
                :aria-label="
                  favorites.has(item.track.filename)
                    ? `Remove ${item.displayTitle} from favourites`
                    : `Add ${item.displayTitle} to favourites`
                "
                :title="
                  favorites.has(item.track.filename)
                    ? 'Remove from Favorites'
                    : 'Add to Favorites'
                "
              >
                <IconHeart
                  :filled="favorites.has(item.track.filename)"
                  :size="13"
                  class="item-heart"
                  :class="{ starred: favorites.has(item.track.filename) }"
                />
              </button>

              <button
                type="button"
                class="item-select-btn"
                :aria-current="
                  item.originalIndex === currentTrackIndex ? 'true' : undefined
                "
                @click="selectTrack(item.originalIndex)"
              >
                <span class="item-content-col">
                  <span class="item-row-top">
                    <span class="item-title" :title="item.track.filename">
                      {{ item.displayTitle }}
                    </span>

                    <span class="item-badges-right">
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
                    </span>
                  </span>

                  <span class="item-row-meta">
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
                  </span>
                </span>
              </button>
            </div>

            <div
              v-if="!catalogLoaded && !catalogFailed"
              class="empty-search-state catalog-loading"
              role="status"
            >
              Loading catalog…
            </div>
            <div
              v-else-if="filteredTracks.length === 0"
              class="empty-search-state"
            >
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
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  max-width: calc(100vw - 24px);
}

.music-mini-player {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  background: color-mix(in srgb, var(--vp-c-bg-elv) 85%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-full, 9999px);
  height: 38px;
  width: 480px;
  max-width: calc(100vw - 24px);
  min-width: 0;
  flex-shrink: 0;
  transition: all var(--duration-normal) ease;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.08);
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

a.mini-btn {
  text-decoration: none;
}

.mini-btn:hover,
.mini-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg-mute);
}

.mini-btn.fav-toggle.active {
  color: var(--c-favorite);
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
  transition: background-color var(--duration-fast) ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.volume-range::-webkit-slider-thumb:hover {
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

.track-name-mini-btn {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.track-name-mini-btn:hover .track-name-mini,
.track-name-mini-btn:focus-visible .track-name-mini {
  color: var(--vp-c-brand);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Hold the marquee still while the title is being pointed at or focused. */
.track-name-mini-btn:hover .track-name-mini.is-scrolling,
.track-name-mini-btn:focus-visible .track-name-mini.is-scrolling {
  animation-play-state: paused;
}

/* Inset so the edge-fade mask on the wrapper does not clip the ring. */
.track-name-mini-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
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

.mini-progress-wrap[aria-disabled='true'] {
  cursor: default;
}

.mini-progress-wrap:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.mini-progress-bar {
  height: 100%;
  background: var(--vp-c-brand);
  transition: width 0.1s linear;
}

/* Playlist Dropdown Panel */
.mini-playlist-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  top: auto;
  width: 480px;
  max-width: calc(100vw - 24px);
  max-height: 65vh;
  background: color-mix(in srgb, var(--vp-c-bg-elv) 94%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--radius-md, 12px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
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

.playlist-search-input:focus,
.playlist-search-input:focus-visible {
  border-color: var(--vp-c-brand);
  outline: 2px solid var(--vp-c-brand-1, #6366f1);
  outline-offset: 1px;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  font-size: 11px;
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
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.filter-fav-btn.active {
  background: color-mix(in srgb, var(--c-favorite) 15%, transparent);
  color: var(--c-favorite);
  border-color: var(--c-favorite);
}

.track-count-badge {
  font-size: 11px;
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
  background: color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent);
  border-left-color: var(--vp-c-brand);
}

.item-select-btn {
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: none;
  border-radius: 0;
  cursor: pointer;
}

.item-select-btn:focus-visible,
.item-fav-col:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
  border-radius: 4px;
}

.item-fav-col {
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-heart {
  color: var(--vp-c-text-3);
  transition: color var(--duration-fast) ease;
}

.item-fav-col:hover .item-heart:not(.starred) {
  color: var(--vp-c-brand-1);
}

.item-heart.starred {
  color: var(--c-favorite);
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
  font-size: 11px;
  color: var(--vp-c-text-2);
  width: 100%;
}

.meta-filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--vp-c-text-2);
  font-size: 11px;
  flex: 1;
  min-width: 0;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
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
.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: all var(--duration-normal) var(--ease-standard);
}

.panel-pop-enter-from,
.panel-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .panel-pop-enter-from,
  .panel-pop-leave-to {
    transform: none;
  }
}

/* Narrow viewports: drop the filename column (it repeats the row's title
   attribute) so the tracker tag keeps the room it needs at 11px. */
@media (max-width: 479.98px) {
  .meta-filename {
    display: none;
  }

  .item-row-meta {
    justify-content: flex-end;
  }
}

@media (max-width: 767px) {
  .music-mini-player-container {
    bottom: 12px;
    width: calc(100vw - 20px);
  }

  .music-mini-player {
    width: 100%;
    height: 36px;
    padding: 3px 8px;
    gap: 4px;
  }

  .volume-inline {
    display: none;
  }

  .mini-btn {
    padding: 3px;
  }

  .mini-playlist-panel {
    width: 100%;
    max-height: 55vh;
  }
}
</style>
