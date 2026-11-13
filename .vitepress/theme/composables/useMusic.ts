// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { ref, computed, shallowRef, triggerRef } from 'vue';
import { data as initialCatalog } from '../../../data/music-initial.data';
import { INITIAL_TRACK_FILENAMES } from '../../../data/initial-tracks';
import { expandCatalog, type MusicTrack } from '../../../lib/music-catalog';
export { INITIAL_TRACK_FILENAMES };
import type { XMPlayer } from '../../../lib/audio/xm-player';
import defaultRatingsJson from '../../../data/music-ratings.json';

const defaultRatings = defaultRatingsJson as Record<string, number>;

// Module-scoped reactive refs (shared singleton state)
const isPlaying = ref(false);

const audioData = ref<Uint8Array | null>(null);
const currentTrackIndex = ref(0);

/**
 * The playable list. Starts as the small curated set (the only part shipped
 * with every page) and is swapped for the full catalog by `ensureCatalog()`,
 * which loads the big `music.data` chunk on demand.
 */
const initialTracks = expandCatalog(initialCatalog);
const tracks = shallowRef<MusicTrack[]>(initialTracks);
const catalogLoaded = ref(false);
const catalogFailed = ref(false);
const progress = ref(0);
const volume = ref(0.7);
const isRepeat = ref(false);

/** Set by HeroSplat when its canvas enters/exits the viewport. */
const isSplatVisible = ref(false);

// Shuffle & History state
const isShuffle = ref(false);
const shuffleDeck = ref<number[]>([]);
const history = ref<number[]>([]);

// Tracker-specific live inspection state
export interface TrackerPlaybackState {
  curSongPos: number;
  curPat: number;
  curRow: number;
  bpm: number;
  tempo: number;
  songlen: number;
  songpats: number[];
  numChannels: number;
}

export interface InstrumentSampleInfo {
  name: string;
  len: number;
  vol: number;
  pan: number;
  loop: number;
  looplen: number;
  type: number;
}

export interface InstrumentInfo {
  index: number;
  name: string;
  samples: InstrumentSampleInfo[];
}

const trackerState = ref<TrackerPlaybackState>({
  curSongPos: 0,
  curPat: 0,
  curRow: 0,
  bpm: 125,
  tempo: 6,
  songlen: 0,
  songpats: [],
  numChannels: 0
});

const defaultBpm = ref(125);
const customBpm = ref(125);
const instruments = ref<InstrumentInfo[]>([]);
const channelMutes = ref<boolean[]>([]);
// shallowRef: the engine reuses the same array/buffers every tick, so changes
// are announced with triggerRef instead of by assigning a new value.
const channelScopes = shallowRef<Float32Array[]>([]);
const liveSongTitle = ref('');

// Web Audio & Engine references
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationGain: GainNode | null = null;
let outputGain: GainNode | null = null;
let xmPlayer: XMPlayer | null = null;
let animationFrame: number | null = null;
let dataArray: Uint8Array<ArrayBuffer> | null = null;
let currentLoadedUrl = '';
let initPromise: Promise<void> | null = null;
let skipTimeout: ReturnType<typeof setTimeout> | null = null;
let scopesEnabled = false;
let loadSeq = 0;

// Favorites, Ratings & Track deep-linking
export const FAVORITES_STORAGE_KEY = 'justme_music_favorites';
export const RATINGS_STORAGE_KEY = 'justme_music_ratings';
const favorites = ref<Set<string>>(new Set());
const ratings = ref<Record<string, number>>({});

const loadFavorites = () => {
  const loaded: Record<string, number> = {};

  // 1. Start with valid 1..5 entries from data/music-ratings.json
  if (defaultRatings && typeof defaultRatings === 'object') {
    for (const [key, val] of Object.entries(defaultRatings)) {
      if (
        typeof val === 'number' &&
        Number.isInteger(val) &&
        val >= 1 &&
        val <= 5
      ) {
        loaded[key] = val;
      }
    }
  }

  if (typeof localStorage !== 'undefined') {
    // 2. Migrate any array entries from FAVORITES_STORAGE_KEY to 5 stars unless already rated
    try {
      const favRaw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (favRaw) {
        const favParsed = JSON.parse(favRaw);
        if (Array.isArray(favParsed)) {
          for (const key of favParsed) {
            if (typeof key === 'string' && key && !loaded[key]) {
              loaded[key] = 5;
            }
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // 3. Merge valid 1..5 integer entries from RATINGS_STORAGE_KEY (0 or invalid removes entry)
    try {
      const ratingsRaw = localStorage.getItem(RATINGS_STORAGE_KEY);
      if (ratingsRaw) {
        const parsedRatings = JSON.parse(ratingsRaw);
        if (
          parsedRatings &&
          typeof parsedRatings === 'object' &&
          !Array.isArray(parsedRatings)
        ) {
          for (const [key, val] of Object.entries(parsedRatings)) {
            if (
              typeof val === 'number' &&
              Number.isInteger(val) &&
              val >= 1 &&
              val <= 5
            ) {
              loaded[key] = val;
            } else {
              delete loaded[key];
            }
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  ratings.value = loaded;
  favorites.value = new Set(
    Object.keys(ratings.value).filter((k) => (ratings.value[k] ?? 0) > 0)
  );
};

const saveFavorites = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    for (const fav of favorites.value) {
      if (!ratings.value[fav]) {
        ratings.value[fav] = 5;
      }
    }
    for (const key of Object.keys(ratings.value)) {
      if (!favorites.value.has(key)) {
        delete ratings.value[key];
      }
    }
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings.value));
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(Array.from(favorites.value))
    );
  } catch {
    // Ignore storage quota/permission errors
  }
};

const getRating = (filename?: string): number => {
  const target = filename ?? currentTrack.value?.filename;
  if (!target) return 0;
  const r = ratings.value[target];
  return typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= 5
    ? r
    : 0;
};

const currentTrackRating = computed(() => getRating());

const setRating = (rating: number, filename?: string) => {
  const target = filename ?? currentTrack.value?.filename;
  if (!target) return;

  const current = getRating(target);
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));

  const nextRatings = { ...ratings.value };
  if (rounded === 0 || rounded === current) {
    delete nextRatings[target];
  } else {
    nextRatings[target] = rounded;
  }
  ratings.value = nextRatings;
  favorites.value = new Set(
    Object.keys(ratings.value).filter((k) => (ratings.value[k] ?? 0) > 0)
  );
  saveFavorites();
};

const isCurrentFavorite = computed(() => {
  const fn = currentTrack.value?.filename;
  return fn ? favorites.value.has(fn) : false;
});

const toggleFavorite = (filename?: string) => {
  const target = filename ?? currentTrack.value?.filename;
  if (!target) return;
  if (getRating(target) > 0) {
    setRating(0, target);
  } else {
    setRating(5, target);
  }
};

const exportRatings = (): string => {
  const sortedKeys = Object.keys(ratings.value)
    .filter((k) => {
      const v = ratings.value[k];
      return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
    })
    .sort((a, b) => a.localeCompare(b));

  const sortedObj: Record<string, number> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = ratings.value[k];
  }
  return JSON.stringify(sortedObj, null, 2) + '\n';
};

export const cleanTitle = (track?: MusicTrack, liveTitle?: string): string => {
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

const currentTrack = computed<MusicTrack | undefined>(
  () => tracks.value[currentTrackIndex.value]
);

const currentTrackUrl = computed(() => currentTrack.value?.url || '');

/** Fisher-Yates shuffle array of indices excluding a specific index if provided */
const generateShuffleDeck = (excludeIndex?: number) => {
  const list = tracks.value;
  if (!list || list.length === 0) return [];
  const indices = Array.from({ length: list.length }, (_, i) => i);
  let pool = indices;
  if (excludeIndex !== undefined && list.length > 1) {
    pool = indices.filter((i) => i !== excludeIndex);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

let catalogPromise: Promise<void> | null = null;

/**
 * Load the full catalog (once) and swap it in. The current track, the history
 * and the shuffle deck are remapped by filename so playback and UI do not
 * jump. Never rejects: on failure the initial set stays and `catalogFailed`
 * is set (a later call retries).
 */
const ensureCatalog = (): Promise<void> => {
  catalogPromise ??= import('../../../data/music.data').then(
    ({ data }) => {
      const full = expandCatalog(data);
      const old = tracks.value;
      const currentName = old[currentTrackIndex.value]?.filename;
      const byName = new Map(full.map((t, i) => [t.filename, i]));
      tracks.value = full;
      currentTrackIndex.value = byName.get(currentName ?? '') ?? 0;
      history.value = history.value
        .map((i) => byName.get(old[i]?.filename ?? '') ?? -1)
        .filter((i) => i >= 0);
      shuffleDeck.value = isShuffle.value
        ? generateShuffleDeck(currentTrackIndex.value)
        : [];
      catalogLoaded.value = true;
      catalogFailed.value = false;
    },
    () => {
      catalogPromise = null;
      catalogFailed.value = true;
    }
  );
  return catalogPromise;
};

/** Test helper: drop the loaded catalog and go back to the initial set. */
const resetCatalog = () => {
  catalogPromise = null;
  tracks.value = initialTracks;
  catalogLoaded.value = false;
  catalogFailed.value = false;
};

const toggleShuffle = () => {
  isShuffle.value = !isShuffle.value;
  if (isShuffle.value) void ensureCatalog();
  if (isShuffle.value) {
    shuffleDeck.value = generateShuffleDeck(currentTrackIndex.value);
  } else {
    shuffleDeck.value = [];
  }
};

const toggleRepeat = () => {
  isRepeat.value = !isRepeat.value;
};

const applyVolume = (vol: number) => {
  if (outputGain) {
    outputGain.gain.value = Math.max(0, Math.min(1, vol));
  }
};

const setVolume = (vol: number) => {
  volume.value = Math.max(0, Math.min(1, vol));
  applyVolume(volume.value);
};

const runAnalysis = () => {
  if (!isPlaying.value) return;

  if (isSplatVisible.value && analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    audioData.value = dataArray;
  }

  if (xmPlayer) {
    progress.value = xmPlayer.getProgress();
    const st = xmPlayer.getTrackerState(false);
    const cur = trackerState.value;
    if (
      cur.curSongPos !== st.curSongPos ||
      cur.curPat !== st.curPat ||
      cur.curRow !== st.curRow ||
      cur.bpm !== st.bpm ||
      cur.tempo !== st.tempo ||
      cur.songlen !== st.songlen ||
      cur.numChannels !== st.numChannels
    ) {
      trackerState.value = {
        curSongPos: st.curSongPos,
        curPat: st.curPat,
        curRow: st.curRow,
        bpm: st.bpm,
        tempo: st.tempo,
        songlen: st.songlen,
        songpats:
          cur.songpats && cur.songpats.length === st.songlen
            ? cur.songpats
            : (xmPlayer.getTrackerState(true).songpats ?? []),
        numChannels: st.numChannels
      };
    }
  }

  animationFrame = requestAnimationFrame(runAnalysis);
};

const publishScopes = (scopes: Float32Array[]) => {
  if (channelScopes.value === scopes) triggerRef(channelScopes);
  else channelScopes.value = scopes;
};

const setScopesEnabled = (enabled: boolean) => {
  scopesEnabled = enabled;
  if (!enabled) {
    channelScopes.value = [];
  }
  if (xmPlayer) {
    xmPlayer.setScopeListener(
      enabled
        ? ({ scopes }) => {
            if (scopes && scopes.length > 0) {
              publishScopes(scopes);
            }
          }
        : null,
      64
    );
  }
};

const initAudio = () => {
  initPromise ??= doInitAudio();
  return initPromise;
};

const doInitAudio = async () => {
  if (typeof window === 'undefined') return;

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

  const { XMPlayer } = await import('../../../lib/audio/xm-player');
  xmPlayer = new XMPlayer({
    onEnded: () => {
      if (isRepeat.value) return;
      handleNext();
    }
  });

  const xmGain = xmPlayer.init(audioContext);
  await xmPlayer.ready;
  if (xmGain) {
    xmGain.connect(animationGain);
    outputGain = audioContext.createGain();
    xmGain.connect(outputGain);
    outputGain.connect(audioContext.destination);
    applyVolume(volume.value);
  }

  // Hook oscilloscope capture if enabled
  if (scopesEnabled) {
    xmPlayer.setScopeListener(({ scopes }) => {
      if (scopes && scopes.length > 0) {
        publishScopes(scopes);
      }
    }, 64);
  }
};

export const loadAndPlayTrack = async (url: string) => {
  const thisSeq = ++loadSeq;
  try {
    await initAudio();
    if (thisSeq !== loadSeq) return;

    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }
    if (thisSeq !== loadSeq) return;

    if (!xmPlayer) return;

    if (currentLoadedUrl !== url) {
      const ok = await xmPlayer.loadUrl(url);
      if (thisSeq !== loadSeq) return;
      if (!ok) {
        throw new Error('Failed to parse XM file');
      }
      currentLoadedUrl = url;
      liveSongTitle.value = xmPlayer.songTitle;
      instruments.value = xmPlayer.getInstruments();
      defaultBpm.value = xmPlayer.defaultBpm;
      customBpm.value = xmPlayer.defaultBpm;

      const nchan = xmPlayer.numChannels;
      channelMutes.value = Array.from({ length: nchan }, () => false);
      trackerState.value = xmPlayer.getTrackerState(true);
    }

    if (thisSeq !== loadSeq) return;

    applyVolume(volume.value);
    xmPlayer.play();
    isPlaying.value = true;

    if (
      animationFrame === null &&
      typeof requestAnimationFrame === 'function'
    ) {
      animationFrame = requestAnimationFrame(runAnalysis);
    }
  } catch {
    if (thisSeq !== loadSeq) return;
    isPlaying.value = false;
    audioData.value = null;
    if (animationFrame !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = null;
    }
    liveSongTitle.value = 'Failed to load track';
    currentLoadedUrl = '';
  }
};

export const resetAudio = () => {
  if (animationFrame !== null) {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = null;
  }
  if (xmPlayer?.isPlaying) {
    try {
      xmPlayer.stop();
    } catch {
      // Ignore errors when stopping
    }
  }
  audioContext = null;
  analyser = null;
  animationGain = null;
  outputGain = null;
  xmPlayer = null;
  dataArray = null;
  currentLoadedUrl = '';
  initPromise = null;
  loadSeq = 0;
};

const togglePlay = async () => {
  // First interaction: fetch the full catalog in the background. Playback may
  // start on the initial set; the index is remapped when the swap lands.
  void ensureCatalog();
  await initAudio();
  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }

  if (isPlaying.value) {
    xmPlayer?.pause();
    isPlaying.value = false;
    audioData.value = null;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else {
    await loadAndPlayTrack(currentTrackUrl.value);
  }
};

const switchTrack = (advanceFn: () => void) => {
  if (skipTimeout) {
    clearTimeout(skipTimeout);
    skipTimeout = null;
  }

  const wasPlaying = isPlaying.value;
  if (xmPlayer?.isPlaying) xmPlayer.stop();

  advanceFn();
  progress.value = 0;
  liveSongTitle.value = '';

  if (wasPlaying) {
    skipTimeout = setTimeout(async () => {
      skipTimeout = null;
      await loadAndPlayTrack(currentTrackUrl.value);
    }, 100);
  }
};

const nextTrack = () => {
  const list = tracks.value;
  if (!list || list.length === 0) return;

  history.value.push(currentTrackIndex.value);
  if (history.value.length > 50) history.value.shift();

  if (isShuffle.value) {
    if (shuffleDeck.value.length === 0) {
      shuffleDeck.value = generateShuffleDeck(currentTrackIndex.value);
    }
    const nextIdx = shuffleDeck.value.pop();
    if (nextIdx !== undefined) {
      currentTrackIndex.value = nextIdx;
      return;
    }
  }

  currentTrackIndex.value = (currentTrackIndex.value + 1) % list.length;
};

const prevTrack = () => {
  const list = tracks.value;
  if (!list || list.length === 0) return;

  if (history.value.length > 0) {
    const prevIdx = history.value.pop()!;
    currentTrackIndex.value = prevIdx;
    return;
  }

  currentTrackIndex.value =
    (currentTrackIndex.value - 1 + list.length) % list.length;
};

// Navigation must pick from the full catalog, so wait for it on first use.
const handleNext = () =>
  catalogLoaded.value
    ? switchTrack(nextTrack)
    : ensureCatalog().then(() => switchTrack(nextTrack));
const handlePrev = () =>
  catalogLoaded.value
    ? switchTrack(prevTrack)
    : ensureCatalog().then(() => switchTrack(prevTrack));

const setTrackIndex = (index: number) => {
  const list = tracks.value;
  if (!list || list.length === 0) return;
  if (index < 0 || index >= list.length) return;
  initialTrackPicked = true;
  if (currentTrackIndex.value !== index) {
    history.value.push(currentTrackIndex.value);
    if (history.value.length > 50) history.value.shift();
  }
  currentTrackIndex.value = index;
};

let initialTrackPicked = false;

const resetInitialTrackPicked = () => {
  initialTrackPicked = false;
};

/**
 * Start the session on a random track from the curated initial list.
 * Falls back to full catalog selection if none of the curated tracks are loaded.
 * Runs at most once per page load and only touches state client-side (call it
 * from onMounted, never at module level, or SSR and hydration would disagree).
 */
const pickRandomInitialTrack = (force = false) => {
  if ((initialTrackPicked && !force) || isPlaying.value) return;
  initialTrackPicked = true;
  const list = tracks.value;
  if (!list || list.length === 0) return;

  const initialSet = new Set(
    INITIAL_TRACK_FILENAMES.map((f) => f.toLowerCase())
  );
  const candidates: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const filename = list[i]?.filename?.toLowerCase();
    if (filename && initialSet.has(filename)) {
      candidates.push(i);
    }
  }

  if (candidates.length > 0) {
    const chosenIndex =
      candidates[Math.floor(Math.random() * candidates.length)];
    currentTrackIndex.value = chosenIndex;
  } else {
    currentTrackIndex.value = Math.floor(Math.random() * list.length);
  }
};

const selectTrack = (originalIndex: number) => {
  initialTrackPicked = true;
  if (currentTrackIndex.value === originalIndex && isPlaying.value) return;
  switchTrack(() => setTrackIndex(originalIndex));
};

const findTrackIndex = (name: string) => {
  const lower = name.toLowerCase();
  return tracks.value.findIndex(
    (t) => t.filename === name || t.filename.toLowerCase() === lower
  );
};

const applyTrackQueryParam = async (search?: string) => {
  const queryStr =
    search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(queryStr);
  const trackParam = params.get('track');
  let matchIdx = trackParam ? findTrackIndex(trackParam) : -1;
  if (trackParam && matchIdx === -1 && !catalogLoaded.value) {
    // Deep link to a track outside the initial set: needs the full catalog.
    await ensureCatalog();
    matchIdx = findTrackIndex(trackParam);
  }
  if (matchIdx !== -1) {
    selectTrack(matchIdx);
  } else {
    pickRandomInitialTrack();
  }
};

// One-time client init shared by every component that mounts the player:
// restore favourites and honour a ?track= deep link. Idempotent, so the mini
// player and the tracker page can both call it from onMounted.
let musicInitialized = false;
let lastAppliedSearch: string | null = null;
/**
 * Called from each player's onMounted. Favourites load once; the `?track=`
 * deep link is re-applied only when the query string changed, so two players
 * mounting on the same page apply it once, but a client-side navigation to a
 * new `?track=` link still works.
 */
const initMusicOnce = () => {
  if (!musicInitialized) {
    musicInitialized = true;
    loadFavorites();
  }
  const search = typeof window !== 'undefined' ? window.location.search : '';
  if (search === lastAppliedSearch) return;
  lastAppliedSearch = search;
  void applyTrackQueryParam(search);
};

const resetMusicInit = () => {
  musicInitialized = false;
  lastAppliedSearch = null;
};

const seek = (percent: number) => {
  if (xmPlayer) {
    xmPlayer.seek(percent);
    progress.value = percent * 100;
  }
};

const jumpToOrder = (orderIdx: number) => {
  if (xmPlayer) {
    xmPlayer.jumpToOrder(orderIdx);
    const st = xmPlayer.getTrackerState(true);
    trackerState.value = st;
  }
};

const toggleChannelMute = (channelIdx: number) => {
  if (!xmPlayer) return;
  const nextVal = !channelMutes.value[channelIdx];
  channelMutes.value[channelIdx] = nextVal;
  xmPlayer.setChannelMute(channelIdx, nextVal);
};

const soloChannel = (channelIdx: number) => {
  if (!xmPlayer) return;
  const numCh = xmPlayer.numChannels;
  const allOthersMuted = channelMutes.value.every((m, idx) =>
    idx === channelIdx ? !m : m
  );

  for (let i = 0; i < numCh; i++) {
    const shouldMute = allOthersMuted ? false : i !== channelIdx;
    channelMutes.value[i] = shouldMute;
    xmPlayer.setChannelMute(i, shouldMute);
  }
};

const getActivePatternData = () => {
  if (!xmPlayer) return null;
  return xmPlayer.getPattern(trackerState.value.curPat);
};

// Actions
const setAudioData = (data: Uint8Array | null) => {
  audioData.value = data;
};

const setPlaying = (val: boolean) => {
  isPlaying.value = val;
  if (!val) audioData.value = null;
};

const setSplatVisible = (val: boolean) => {
  isSplatVisible.value = val;
};

const setBpm = (newBpm: number) => {
  customBpm.value = Math.max(32, Math.min(255, Math.round(newBpm)));
  if (xmPlayer) {
    xmPlayer.setBpm(customBpm.value);
    trackerState.value.bpm = customBpm.value;
  }
};

const resetBpm = () => {
  if (xmPlayer) {
    xmPlayer.resetBpm();
    customBpm.value = xmPlayer.defaultBpm;
    trackerState.value.bpm = xmPlayer.defaultBpm;
  } else {
    customBpm.value = defaultBpm.value;
    trackerState.value.bpm = defaultBpm.value;
  }
};

const musicState = {
  // Reactive states
  isPlaying,
  audioData,
  currentTrackIndex,
  currentTrack,
  currentTrackUrl,
  progress,
  volume,
  isRepeat,
  tracks,
  catalogLoaded,
  catalogFailed,
  ensureCatalog,
  resetCatalog,
  isSplatVisible,
  isShuffle,
  history,
  liveSongTitle,

  // Favorites, Ratings & Title
  FAVORITES_STORAGE_KEY,
  RATINGS_STORAGE_KEY,
  favorites,
  ratings,
  loadFavorites,
  saveFavorites,
  isCurrentFavorite,
  toggleFavorite,
  getRating,
  currentTrackRating,
  setRating,
  exportRatings,
  cleanTitle,
  applyTrackQueryParam,
  initMusicOnce,
  resetMusicInit,

  // Tracker state
  trackerState,
  defaultBpm,
  customBpm,
  instruments,
  channelMutes,
  channelScopes,

  // Player controls & actions
  INITIAL_TRACK_FILENAMES,
  resetInitialTrackPicked,
  resetAudio,
  loadAndPlayTrack,
  initAudio,
  togglePlay,
  toggleShuffle,
  toggleRepeat,
  setVolume,
  setBpm,
  resetBpm,
  setScopesEnabled,
  setAudioData,
  setPlaying,
  setSplatVisible,
  setTrackIndex,
  pickRandomInitialTrack,
  selectTrack,
  nextTrack,
  prevTrack,
  handleNext,
  handlePrev,
  seek,
  jumpToOrder,
  toggleChannelMute,
  soloChannel,
  getActivePatternData
};

// Shared state for the mini player and full tracker page
export const useMusic = () => musicState;

export default useMusic;
