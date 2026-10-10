<!-- SPDX-FileCopyrightText: Jonny van der Hoeven -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  useElementSize,
  useElementVisibility,
  useVirtualList
} from '@vueuse/core';
import useMusic from '../.vitepress/theme/composables/useMusic';
import { XMPlayer } from '../lib/audio/xm-player';
import type { MusicTrack } from '../data/music.data';

const {
  isPlaying,
  currentTrackIndex,
  currentTrack,
  progress,
  volume,
  isRepeat,
  isShuffle,
  tracks,
  liveSongTitle,
  trackerState,
  defaultBpm,
  instruments,

  channelMutes,
  channelScopes,
  togglePlay,
  toggleRepeat,
  toggleShuffle,
  setVolume,
  setBpm,
  resetBpm,
  selectTrack,
  handleNext,
  handlePrev,
  seek: seekPlayer,
  jumpToOrder,
  toggleChannelMute,
  soloChannel,
  getActivePatternData
} = useMusic();

// Canvas refs
const playerRootRef = ref<HTMLElement | null>(null);
const isOnScreen = useElementVisibility(playerRootRef);
const scopesCanvasRef = ref<HTMLCanvasElement | null>(null);
const patternCanvasRef = ref<HTMLCanvasElement | null>(null);
const patternPaneRef = ref<HTMLElement | null>(null);
const { width: patternPaneWidth } = useElementSize(patternPaneRef);
const orderContainerRef = ref<HTMLElement | null>(null);
const isOrderGridMode = ref(false);

const isCustomBpm = computed(() => {
  return trackerState.value.bpm !== defaultBpm.value;
});

// UI states
const activeTab = ref<'pattern' | 'instruments' | 'playlist'>('pattern');
const copiedNotification = ref(false);
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
    // Ignore storage issues
  }
};

const saveFavorites = () => {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(Array.from(favorites.value))
    );
  } catch {
    // Ignore
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
  favorites.value = new Set(favorites.value);
  saveFavorites();
};

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

const displaySongTitle = computed(() => {
  return cleanTitle(currentTrack.value, liveSongTitle.value);
});

// Playlist filtering
interface FilteredItem {
  track: MusicTrack;
  originalIndex: number;
  displayTitle: string;
}

const indexedTracks = computed<FilteredItem[]>(() => {
  return tracks.map((track, originalIndex) => ({
    track,
    originalIndex,
    displayTitle: cleanTitle(track)
  }));
});

const filteredTracks = computed<FilteredItem[]>(() => {
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
    const matchTitle = (track.title || '').toLowerCase().includes(query);
    const matchDisplay = displayTitle.toLowerCase().includes(query);
    const matchFile = (track.filename || '').toLowerCase().includes(query);
    return matchTitle || matchDisplay || matchFile;
  });
});

const {
  list: virtualList,
  containerProps,
  wrapperProps,
  scrollTo
} = useVirtualList(filteredTracks, {
  itemHeight: 44,
  overscan: 10
});

watch([searchQuery, onlyFavorites], () => {
  if (containerProps.ref.value) {
    containerProps.ref.value.scrollTop = 0;
  }
  scrollTo(0);
});

// Deep-link copying
const copyDeepLink = async () => {
  if (typeof window === 'undefined') return;
  const fn = currentTrack.value?.filename;
  if (!fn) return;

  const url = new URL(window.location.href);
  url.searchParams.set('track', fn);
  try {
    await navigator.clipboard.writeText(url.toString());
    copiedNotification.value = true;
    setTimeout(() => {
      copiedNotification.value = false;
    }, 2000);
  } catch {
    // Fallback if clipboard API restricted
  }
};

const handleProgressBarClick = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seekPlayer(pct);
};

// ==========================================
// Canvas Oscilloscope Renderer
// ==========================================
let rafId: number | null = null;

// Split channels into rows of near-equal length (e.g. 22 -> 8/7/7, 21 -> 7/7/7)
// so no tiles are left empty and every row spans the full canvas width.
const scopeRowLayout = (numCh: number) => {
  const rows = Math.ceil(numCh / 8);
  const base = Math.floor(numCh / rows);
  const extra = numCh % rows;
  const rowStart = (r: number) => r * base + Math.min(r, extra);
  const rowCount = (r: number) => base + (r < extra ? 1 : 0);
  return { rows, rowStart, rowCount };
};

const renderOscilloscopes = () => {
  const canvas = scopesCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const numCh = Math.max(1, trackerState.value.numChannels || 4);
  const { rows, rowStart, rowCount } = scopeRowLayout(numCh);
  const boxH = height / rows;

  const scopes = channelScopes.value;
  const mutes = channelMutes.value;

  for (let ch = 0; ch < numCh; ch++) {
    let row = 0;
    while (row + 1 < rows && ch >= rowStart(row + 1)) row++;
    const boxW = width / rowCount(row);
    const x0 = (ch - rowStart(row)) * boxW;
    const y0 = row * boxH;
    const isMuted = mutes[ch];

    // Background tile
    ctx.fillStyle = isMuted ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x0 + 1, y0 + 1, boxW - 2, boxH - 2);

    // Border
    ctx.strokeStyle = isMuted
      ? 'rgba(239, 68, 68, 0.3)'
      : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 1, y0 + 1, boxW - 2, boxH - 2);

    // Channel label
    ctx.fillStyle = isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`CH${ch + 1}${isMuted ? ' (M)' : ''}`, x0 + 4, y0 + 12);

    // Waveform
    const scopeData = scopes[ch];
    const midY = y0 + boxH / 2;

    // Brand violet trace with a soft glow. The canvas background is always
    // black (see .scopes-canvas), so this reads the same in light and dark mode.
    ctx.beginPath();
    ctx.strokeStyle = isMuted ? '#71717a' : '#a78bfa';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = isMuted ? 'transparent' : 'rgba(139, 92, 246, 0.9)';
    ctx.shadowBlur = isMuted ? 0 : 8;

    if (scopeData && scopeData.length > 0 && isPlaying.value && !isMuted) {
      const step = (boxW - 8) / scopeData.length;
      for (let i = 0; i < scopeData.length; i++) {
        const sx = x0 + 4 + i * step;
        const amp = scopeData[i] * (boxH * 0.4);
        const sy = Math.max(y0 + 2, Math.min(y0 + boxH - 2, midY - amp));
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    } else {
      // Flat center line
      ctx.moveTo(x0 + 4, midY);
      ctx.lineTo(x0 + boxW - 4, midY);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
};

// ==========================================
// Canvas Pattern Grid Renderer
// ==========================================
// Modules can have up to 32 channels, far more than fit in the pane at a
// readable size. Rather than a hidden horizontal scroll, the channels are split
// into pages of near-equal size that each fill the pane width (see pager).
const PATTERN_CH_MIN_WIDTH = 96;
const PATTERN_ROW_NUM_WIDTH = 36;
const PATTERN_HEIGHT = 320;
const PATTERN_HEADER_HEIGHT = 18;

const patternPage = ref(0);

const patternPages = computed(() => {
  const numCh = Math.max(1, trackerState.value.numChannels || 4);
  const width = patternPaneWidth.value;
  // Pane hidden (width 0) or not measured yet: don't paginate.
  const perPage = width
    ? Math.max(
        1,
        Math.floor((width - PATTERN_ROW_NUM_WIDTH) / PATTERN_CH_MIN_WIDTH)
      )
    : numCh;
  const pages = Math.ceil(numCh / perPage);
  const base = Math.floor(numCh / pages);
  const extra = numCh % pages;
  return Array.from({ length: pages }, (_, p) => {
    const start = p * base + Math.min(p, extra);
    return { start, end: start + base + (p < extra ? 1 : 0) };
  });
});

const activePatternPage = computed(() =>
  Math.min(patternPage.value, patternPages.value.length - 1)
);

watch(currentTrackIndex, () => {
  patternPage.value = 0;
});

const renderPatternGrid = () => {
  const canvas = patternCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const patData = getActivePatternData();
  const curRow = trackerState.value.curRow;
  const mutes = channelMutes.value;

  // Back the canvas with device pixels so the monospace text stays crisp on
  // HiDPI screens; all drawing below is in CSS pixels.
  const width =
    patternPaneWidth.value || canvas.parentElement?.clientWidth || 0;
  if (!width) return;
  const height = PATTERN_HEIGHT;
  const dpr = window.devicePixelRatio || 1;
  const bitmapW = Math.round(width * dpr);
  const bitmapH = Math.round(height * dpr);
  if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
    canvas.width = bitmapW;
    canvas.height = bitmapH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Patterns can have up to 256 rows, not always 64.
  const numRows = patData ? patData.length : 64;

  const rowNumWidth = PATTERN_ROW_NUM_WIDTH;
  const { start: chStart, end: chEnd } =
    patternPages.value[activePatternPage.value];
  const pageChannels = chEnd - chStart;
  const rowHeight = 20;
  const centerRowY = Math.floor(height / (2 * rowHeight)) * rowHeight;
  const visibleRowsCount = Math.floor(height / rowHeight);
  const halfVisible = Math.floor(visibleRowsCount / 2);

  const chWidth = (width - rowNumWidth) / pageChannels;

  // Background
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, width, height);

  // Active playing row highlight bar
  ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
  ctx.fillRect(0, centerRowY, width, rowHeight);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, centerRowY, width, rowHeight);

  // Font setup
  ctx.font = '11px monospace';

  // Draw rows from (curRow - halfVisible) to (curRow + halfVisible)
  for (let rOffset = -halfVisible; rOffset <= halfVisible; rOffset++) {
    const rowIdx = curRow + rOffset;
    const yPos = centerRowY + rOffset * rowHeight;

    if (yPos < -rowHeight || yPos > height) continue;

    const isValidRow = rowIdx >= 0 && rowIdx < numRows;

    // Row number column
    ctx.fillStyle = rowIdx === curRow ? '#60a5fa' : '#52525b';
    const hexRow = isValidRow
      ? (rowIdx < 16 ? '0' : '') + rowIdx.toString(16).toUpperCase()
      : '··';
    ctx.fillText(hexRow, 6, yPos + 14);

    if (!isValidRow || !patData || !patData[rowIdx]) continue;

    const rowData = patData[rowIdx];

    // Channels on the current page
    for (let c = chStart; c < chEnd; c++) {
      const cell = rowData[c];
      const cx = rowNumWidth + (c - chStart) * chWidth;
      const dim = mutes[c];

      if (dim) ctx.globalAlpha = 0.35;

      if (!cell) {
        ctx.fillStyle = '#3f3f46';
        ctx.fillText('··· ·· ·· ···', cx + 4, yPos + 14);
        ctx.globalAlpha = 1;
        continue;
      }

      const note = cell[0];
      const inst = cell[1];
      const vol = cell[2];
      const eff = cell[3];
      const param = cell[4];

      // Note text
      const noteStr = XMPlayer.prettifyNote(note);
      ctx.fillStyle =
        note >= 0 ? (rowIdx === curRow ? '#38bdf8' : '#0284c7') : '#52525b';
      ctx.fillText(noteStr, cx + 2, yPos + 14);

      // Instrument
      const instStr =
        inst > 0
          ? (inst < 16 ? '0' : '') + inst.toString(16).toUpperCase()
          : '··';
      ctx.fillStyle =
        inst > 0 ? (rowIdx === curRow ? '#fbbf24' : '#d97706') : '#3f3f46';
      ctx.fillText(instStr, cx + 30, yPos + 14);

      // Volume
      const volStr =
        vol > 0 ? vol.toString(16).toUpperCase().padStart(2, '0') : '··';
      ctx.fillStyle = vol > 0 ? '#10b981' : '#3f3f46';
      ctx.fillText(volStr, cx + 48, yPos + 14);

      // Effect
      const effStr = XMPlayer.prettifyEffect(eff, param);
      ctx.fillStyle = effStr !== '···' ? '#f43f5e' : '#3f3f46';
      ctx.fillText(effStr, cx + 66, yPos + 14);

      ctx.globalAlpha = 1;
    }
  }

  // Draw vertical dividers between channels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rowNumWidth, 0);
  ctx.lineTo(rowNumWidth, height);
  for (let c = 1; c <= pageChannels; c++) {
    const cx = rowNumWidth + c * chWidth;
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
  }
  ctx.stroke();

  // Sticky channel header, so the columns stay identifiable (and match the
  // CHn tiles in the waveform grid above) while the rows scroll underneath.
  ctx.fillStyle = 'rgba(9, 10, 15, 0.94)';
  ctx.fillRect(0, 0, width, PATTERN_HEADER_HEIGHT);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, PATTERN_HEADER_HEIGHT - 0.5);
  ctx.lineTo(width, PATTERN_HEADER_HEIGHT - 0.5);
  ctx.stroke();
  ctx.font = '10px monospace';
  for (let c = chStart; c < chEnd; c++) {
    const isMuted = mutes[c];
    ctx.fillStyle = isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.55)';
    ctx.fillText(
      `CH${c + 1}${isMuted ? ' (M)' : ''}`,
      rowNumWidth + (c - chStart) * chWidth + 4,
      12
    );
  }
};

const animLoop = () => {
  renderOscilloscopes();
  if (activeTab.value === 'pattern') {
    renderPatternGrid();
  }
  rafId = isOnScreen.value ? requestAnimationFrame(animLoop) : null;
};

// Canvas animations pause off-screen (AGENTS.md rule 4) and resume on return.
watch(isOnScreen, (visible) => {
  if (visible && rafId === null) {
    rafId = requestAnimationFrame(animLoop);
  } else if (!visible && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

// Handle scope canvas clicks to mute/solo
const handleScopesCanvasClick = (e: MouseEvent) => {
  const canvas = scopesCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const numCh = Math.max(1, trackerState.value.numChannels || 4);
  const { rows, rowStart, rowCount } = scopeRowLayout(numCh);
  const row = Math.min(rows - 1, Math.floor(clickY / (canvas.height / rows)));
  const col = Math.min(
    rowCount(row) - 1,
    Math.floor(clickX / (canvas.width / rowCount(row)))
  );
  const chIdx = rowStart(row) + col;

  if (chIdx >= 0 && chIdx < numCh) {
    if (e.shiftKey || e.altKey) {
      soloChannel(chIdx);
    } else {
      toggleChannelMute(chIdx);
    }
  }
};

onMounted(() => {
  loadFavorites();

  // Read URL query param ?track=
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
        // selectTrack (not setTrackIndex) so audio that is already playing
        // switches to the linked track instead of drifting out of sync with it.
        selectTrack(matchIdx);
      }
    }
  }

  rafId = requestAnimationFrame(animLoop);
});

// Keep the active pattern order pill centred in its strip. Scroll the strip
// itself: scrollIntoView() would also scroll the page vertically whenever the
// strip is off-screen, yanking the reader back up mid-scroll.
watch(
  () => trackerState.value.curSongPos,
  (pos) => {
    const container = orderContainerRef.value;
    if (!container || isOrderGridMode.value) return;
    const activeEl = container.querySelector(
      `[data-order-idx="${pos}"]`
    ) as HTMLElement | null;
    if (!activeEl) return;
    const c = container.getBoundingClientRect();
    const el = activeEl.getBoundingClientRect();
    container.scrollTo({
      left:
        container.scrollLeft + (el.left - c.left) - (c.width - el.width) / 2,
      behavior: 'smooth'
    });
  }
);

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<template>
  <div ref="playerRootRef" class="tracker-player-wrap">
    <!-- Top Bar: Song Title, Deep link, Stats -->
    <div class="tracker-header-card">
      <div class="header-main-info">
        <div class="song-titles-row">
          <h2 class="tracker-song-title">
            {{ displaySongTitle }}
          </h2>
          <span v-if="currentTrack?.filename" class="tracker-filename">
            {{ currentTrack.filename }}
          </span>
        </div>

        <div class="tracker-badges-row">
          <span class="tracker-meta-badge">
            <strong>BPM:</strong> {{ trackerState.bpm }}
          </span>
          <span class="tracker-meta-badge">
            <strong>Spd:</strong> {{ trackerState.tempo }}
          </span>
          <span class="tracker-meta-badge">
            <strong>Ch:</strong> {{ trackerState.numChannels }}
          </span>
          <span class="tracker-meta-badge">
            <strong>Ptn:</strong> {{ trackerState.curPat }}
          </span>
          <span class="tracker-meta-badge">
            <strong>Row:</strong> {{ trackerState.curRow }}
          </span>
          <span class="tracker-meta-badge">
            <strong>Pos:</strong> {{ trackerState.curSongPos }}/{{
              trackerState.songlen
            }}
          </span>
        </div>
      </div>

      <!-- Actions & Deep Link -->
      <div class="header-actions-row">
        <button
          class="tracker-btn share-btn"
          @click="copyDeepLink"
          type="button"
          :title="copiedNotification ? 'Link Copied!' : 'Copy Shareable Link'"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
            />
            <path
              d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
            />
          </svg>
          <span>{{ copiedNotification ? 'Copied!' : 'Share' }}</span>
        </button>

        <button
          class="tracker-btn fav-btn"
          :class="{ active: isCurrentFavorite }"
          @click="toggleFavorite()"
          type="button"
          :title="isCurrentFavorite ? 'Remove Favorite' : 'Save Favorite'"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            :fill="isCurrentFavorite ? '#ef4444' : 'none'"
            :stroke="isCurrentFavorite ? '#ef4444' : 'currentColor'"
            stroke-width="2"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Transport Controls Bar -->
    <div class="tracker-transport-card">
      <div class="transport-controls">
        <button
          class="transport-btn"
          @click="handlePrev"
          type="button"
          title="Previous Track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        <button
          class="transport-btn play-btn"
          @click="togglePlay"
          type="button"
          :title="isPlaying ? 'Pause' : 'Play'"
        >
          <svg
            v-if="!isPlaying"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>

        <button
          class="transport-btn"
          @click="handleNext"
          type="button"
          title="Next Track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M16 6h2v12h-2zm-10.5 12 8.5-6-8.5-6z" />
          </svg>
        </button>

        <button
          class="transport-btn toggle-btn"
          :class="{ active: isShuffle }"
          @click="toggleShuffle"
          type="button"
          :title="isShuffle ? 'Shuffle On' : 'Shuffle Off'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path
              d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.42-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.12z"
            />
          </svg>
        </button>

        <button
          class="transport-btn toggle-btn"
          :class="{ active: isRepeat }"
          @click="toggleRepeat"
          type="button"
          :title="isRepeat ? 'Repeat On' : 'Repeat Off'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path
              d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
            />
          </svg>
        </button>
      </div>

      <!-- Seek Progress Bar -->
      <div class="progress-wrap" @click="handleProgressBarClick">
        <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
      </div>

      <!-- Volume Slider -->
      <div class="volume-control-wrap">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
          class="vol-icon"
        >
          <path
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
          />
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          @input="setVolume(Number(($event.target as HTMLInputElement).value))"
          class="volume-slider"
        />
        <span class="vol-text">{{ Math.round(volume * 100) }}%</span>
      </div>

      <!-- BPM Slider & Controls -->
      <div class="bpm-control-wrap">
        <span class="bpm-label">BPM:</span>
        <input
          type="range"
          min="40"
          max="240"
          step="1"
          :value="trackerState.bpm"
          @input="setBpm(Number(($event.target as HTMLInputElement).value))"
          class="bpm-slider"
          title="Adjust song tempo/BPM"
        />
        <input
          type="number"
          min="40"
          max="240"
          :value="trackerState.bpm"
          @change="setBpm(Number(($event.target as HTMLInputElement).value))"
          class="bpm-number-input"
          title="Edit exact BPM value"
        />
        <button
          v-if="isCustomBpm"
          @click="resetBpm"
          class="bpm-reset-btn"
          type="button"
          :title="`Reset to original ${defaultBpm} BPM`"
        >
          ↺ Reset
        </button>
      </div>
    </div>

    <!-- Song Pattern Sequence (Order List) -->
    <div
      v-if="trackerState.songpats && trackerState.songpats.length > 0"
      class="tracker-sequence-card"
    >
      <div class="sequence-title">
        <div class="sequence-title-left">
          <span
            >Pattern Order List ({{
              trackerState.songpats.length
            }}
            orders):</span
          >
          <small
            >Current: Order #{{ trackerState.curSongPos }} (Pat #{{
              trackerState.curPat
            }})</small
          >
        </div>
        <div class="sequence-title-right">
          <button
            class="layout-toggle-btn"
            :class="{ active: isOrderGridMode }"
            @click="isOrderGridMode = !isOrderGridMode"
            type="button"
            :title="
              isOrderGridMode
                ? 'Switch to single scrollable row'
                : 'Wrap onto multiple rows'
            "
          >
            {{ isOrderGridMode ? '☵ Single Row' : '☷ Multi-Row Grid' }}
          </button>
        </div>
      </div>
      <div
        ref="orderContainerRef"
        class="sequence-pills-row"
        :class="{ 'grid-mode': isOrderGridMode }"
      >
        <button
          v-for="(patNum, idx) in trackerState.songpats"
          :key="idx"
          :data-order-idx="idx"
          class="order-pill"
          :class="{ active: idx === trackerState.curSongPos }"
          @click="jumpToOrder(idx)"
          type="button"
          :title="`Jump to Order ${idx} (Pattern ${patNum})`"
        >
          <span class="order-idx"
            >{{ (idx < 16 ? '0' : '') + idx.toString(16).toUpperCase() }}:</span
          >
          <span class="pat-val">{{ patNum }}</span>
        </button>
      </div>
    </div>
    <!-- Reserves the card's height until a song is loaded, so starting playback
         does not push everything below it (and the reader's scroll position)
         down. -->
    <div v-else class="tracker-sequence-card sequence-placeholder">
      Press play to load the pattern order list.
    </div>

    <!-- Channel Oscilloscopes Grid Canvas -->
    <div class="tracker-scopes-card">
      <div class="scopes-header">
        <span>Channel Waveforms</span>
        <span class="scopes-hint"
          >Click channel to mute / Shift+Click to solo</span
        >
      </div>
      <canvas
        ref="scopesCanvasRef"
        width="800"
        height="120"
        class="scopes-canvas"
        @click="handleScopesCanvasClick"
      ></canvas>
    </div>

    <!-- Tabs Navigation: Pattern Matrix vs Instruments vs Playlist -->
    <div class="tracker-tabs-card">
      <div class="tracker-tab-buttons">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'pattern' }"
          @click="activeTab = 'pattern'"
          type="button"
        >
          Pattern View
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'instruments' }"
          @click="activeTab = 'instruments'"
          type="button"
        >
          Instruments & Samples ({{ instruments.length }})
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'playlist' }"
          @click="activeTab = 'playlist'"
          type="button"
        >
          Track Archive ({{ tracks.length }})
        </button>
      </div>

      <!-- Tab Content: Live Pattern Matrix -->
      <div
        v-show="activeTab === 'pattern'"
        ref="patternPaneRef"
        class="tab-pane pattern-pane"
      >
        <div
          v-if="patternPages.length > 1"
          class="pattern-pager"
          role="group"
          aria-label="Pattern channel pages"
        >
          <span class="pattern-pager-label">Channels</span>
          <button
            v-for="(page, i) in patternPages"
            :key="i"
            type="button"
            class="pager-btn"
            :class="{ active: i === activePatternPage }"
            :aria-pressed="i === activePatternPage"
            @click="patternPage = i"
          >
            {{ page.start + 1 }}–{{ page.end }}
          </button>
        </div>
        <canvas ref="patternCanvasRef" class="pattern-canvas"></canvas>
      </div>

      <!-- Tab Content: Instruments & Samples -->
      <div
        v-show="activeTab === 'instruments'"
        class="tab-pane instruments-pane"
      >
        <div v-if="instruments.length === 0" class="empty-state">
          No instruments loaded for this track.
        </div>
        <div v-else class="instruments-grid">
          <div
            v-for="inst in instruments"
            :key="inst.index"
            class="instrument-card"
          >
            <div class="inst-header">
              <span class="inst-index"
                >#{{
                  (inst.index < 16 ? '0' : '') +
                  inst.index.toString(16).toUpperCase()
                }}</span
              >
              <span class="inst-name">{{
                inst.name || 'Untitled Instrument'
              }}</span>
            </div>
            <div
              v-if="inst.samples && inst.samples.length > 0"
              class="samples-list"
            >
              <div
                v-for="(samp, sIdx) in inst.samples"
                :key="sIdx"
                class="sample-row"
              >
                <span class="samp-name">{{
                  samp.name || `Sample ${sIdx + 1}`
                }}</span>
                <span class="samp-meta">
                  {{ Math.round(samp.len / 1024) }}KB · Vol: {{ samp.vol }} ·
                  Pan: {{ samp.pan }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Archive Playlist -->
      <div v-show="activeTab === 'playlist'" class="tab-pane playlist-pane">
        <div class="playlist-pane-header">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search tracks by name, file..."
            class="playlist-search-box"
          />
          <button
            class="filter-fav-btn"
            :class="{ active: onlyFavorites }"
            @click="onlyFavorites = !onlyFavorites"
            type="button"
          >
            {{ onlyFavorites ? '★ Favorites Only' : '☆ All' }}
          </button>
        </div>

        <div v-bind="containerProps" class="archive-items-container">
          <div v-bind="wrapperProps">
            <div
              v-for="{ data: item, index } in virtualList"
              :key="index"
              class="archive-item"
              :class="{ active: item.originalIndex === currentTrackIndex }"
              @click="selectTrack(item.originalIndex)"
            >
              <span
                class="archive-item-fav"
                @click.stop="toggleFavorite(item.track.filename)"
              >
                {{ favorites.has(item.track.filename) ? '❤️' : '🤍' }}
              </span>
              <span class="archive-item-title">{{ item.displayTitle }}</span>
              <span class="archive-item-meta"
                >{{ item.track.channels || '?' }}ch</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracker-player-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 1.5rem 0 2.5rem 0;
  font-family: inherit;
}

/* Cards */
.tracker-header-card,
.tracker-transport-card,
.tracker-sequence-card,
.tracker-scopes-card,
.tracker-tabs-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
}

/* Same height as the loaded single-row order card (title row + pill row) */
.sequence-placeholder {
  min-height: 118px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

/* Header */
.tracker-header-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.song-titles-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.tracker-song-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  /* Drop the .vp-doc h2 rule + top padding, which leave a stray hairline and
     a dead band above the title inside the card. */
  padding: 0;
  border-top: none;
  color: var(--vp-c-text-1);
}

.tracker-filename {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-family: monospace;
  overflow-wrap: anywhere;
}

.tracker-badges-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tracker-meta-badge {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--vp-c-text-2);
}

.tracker-meta-badge strong {
  color: var(--vp-c-brand-1);
}

.header-actions-row {
  display: flex;
  gap: 8px;
}

.tracker-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tracker-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tracker-btn.fav-btn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
}

/* Transport */
.tracker-transport-card {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.transport-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transport-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.transport-btn:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.transport-btn.play-btn {
  width: 40px;
  height: 40px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.transport-btn.toggle-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.progress-wrap {
  flex: 1;
  min-width: 150px;
  height: 8px;
  background: var(--vp-c-bg-mute);
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.1s linear;
}

.volume-control-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 80px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.vol-text {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--vp-c-text-3);
  min-width: 32px;
}

.bpm-control-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--vp-c-bg-mute);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.bpm-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--vp-c-text-2);
}

.bpm-slider {
  width: 70px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.bpm-number-input {
  width: 48px;
  padding: 2px 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  font-family: monospace;
  font-size: 0.75rem;
  text-align: center;
}

.bpm-number-input:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.bpm-reset-btn {
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bpm-reset-btn:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* Sequence pills */
.sequence-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.sequence-title-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.sequence-title-left small {
  color: var(--vp-c-text-3);
  font-weight: normal;
}

.layout-toggle-btn {
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.layout-toggle-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.layout-toggle-btn.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.sequence-pills-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--vp-c-brand-1) var(--vp-c-bg-mute);
}

.sequence-pills-row::-webkit-scrollbar {
  height: 6px;
}

.sequence-pills-row::-webkit-scrollbar-track {
  background: var(--vp-c-bg-mute);
  border-radius: 3px;
}

.sequence-pills-row::-webkit-scrollbar-thumb {
  background: var(--vp-c-brand-1);
  border-radius: 3px;
}

.sequence-pills-row.grid-mode {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  max-height: 160px;
  overflow-y: auto;
  overflow-x: hidden;
}

.order-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 8px;
  font-family: monospace;
  font-size: 0.8rem;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.1s ease;
}

.order-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.order-pill.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
}

/* Scopes Canvas */
.scopes-header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.scopes-hint {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--vp-c-text-2);
}

.scopes-canvas {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  background: #000;
  cursor: pointer;
}

/* Tabs */
.tracker-tab-buttons {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

/* Phones: three equal tabs with tighter padding, so the longer labels wrap to
   two lines at most instead of three. */
@media (max-width: 480px) {
  .tab-btn {
    flex: 1 1 0;
    padding: 8px 4px;
    font-size: 0.8rem;
    line-height: 1.3;
  }
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.pattern-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.pattern-pager-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}

.pager-btn {
  padding: 3px 10px;
  font-family: monospace;
  font-size: 0.8rem;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.pager-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pager-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pattern-canvas {
  width: 100%;
  height: 320px;
  border-radius: 8px;
  background: #090a0f;
  display: block;
}

/* Instruments Pane */
.instruments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  max-height: 340px;
  overflow-y: auto;
}

.instrument-card {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px;
}

.inst-header {
  display: flex;
  gap: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.inst-index {
  color: var(--vp-c-brand-1);
  font-family: monospace;
}

.samples-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sample-row {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  padding: 4px 6px;
  border-radius: 4px;
}

.samp-name {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.samp-meta {
  color: var(--vp-c-text-3);
  font-family: monospace;
}

/* Playlist Pane */
.playlist-pane-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.playlist-search-box {
  flex: 1;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 12px;
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
}

.archive-items-container {
  height: 280px;
  overflow-y: auto;
}

.archive-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 10px;
  border-radius: 6px;
  cursor: pointer;
  border-bottom: 1px solid var(--vp-c-divider);
}

.archive-item:hover {
  background: var(--vp-c-bg-mute);
}

.archive-item.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.archive-item-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.85rem;
}

.archive-item-meta {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-family: monospace;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
</style>
