// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { ref, computed } from 'vue';
import { data as tracks, type MusicTrack } from '../../../data/music.data';
import type { XMPlayer } from '../../../lib/audio/xm-player';

// Module-scoped reactive refs (shared singleton state)
const isPlaying = ref(false);

const audioData = ref<Uint8Array | null>(null);
const currentTrackIndex = ref(0);
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
const channelScopes = ref<Float32Array[]>([]);
const liveSongTitle = ref('');

// Web Audio & Engine references
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationGain: GainNode | null = null;
let outputGain: GainNode | null = null;
let xmPlayer: XMPlayer | null = null;
let animationFrame: number | null = null;
let dataArray: Uint8Array | null = null;
let currentLoadedUrl = '';
let initPromise: Promise<void> | null = null;
let skipTimeout: ReturnType<typeof setTimeout> | null = null;
let scopesEnabled = false;

// Favorites & Track deep-linking
export const FAVORITES_STORAGE_KEY = 'justme_music_favorites';
const favorites = ref<Set<string>>(new Set());

const loadFavorites = () => {
  try {
    if (typeof localStorage === 'undefined') return;
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
    if (typeof localStorage === 'undefined') return;
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
  favorites.value = new Set(favorites.value);
  saveFavorites();
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
  () => tracks[currentTrackIndex.value]
);

const currentTrackUrl = computed(() => currentTrack.value?.url || '');

/** Fisher-Yates shuffle array of indices excluding a specific index if provided */
const generateShuffleDeck = (excludeIndex?: number) => {
  if (!tracks || tracks.length === 0) return [];
  const indices = Array.from({ length: tracks.length }, (_, i) => i);
  let pool = indices;
  if (excludeIndex !== undefined && tracks.length > 1) {
    pool = indices.filter((i) => i !== excludeIndex);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

const toggleShuffle = () => {
  isShuffle.value = !isShuffle.value;
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
              channelScopes.value = scopes;
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
        channelScopes.value = scopes;
      }
    }, 64);
  }
};

const loadAndPlayTrack = async (url: string) => {
  await initAudio();
  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }
  if (!xmPlayer) return;

  if (currentLoadedUrl !== url) {
    await xmPlayer.loadUrl(url);
    currentLoadedUrl = url;
    liveSongTitle.value = xmPlayer.songTitle;
    instruments.value = xmPlayer.getInstruments();
    defaultBpm.value = xmPlayer.defaultBpm;
    customBpm.value = xmPlayer.defaultBpm;

    const nchan = xmPlayer.numChannels;
    channelMutes.value = Array.from({ length: nchan }, () => false);
    trackerState.value = xmPlayer.getTrackerState(true);
  }

  applyVolume(volume.value);
  xmPlayer.play();
  isPlaying.value = true;

  if (animationFrame === null) {
    animationFrame = requestAnimationFrame(runAnalysis);
  }
};

const togglePlay = async () => {
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
  if (!tracks || tracks.length === 0) return;

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

  currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length;
};

const prevTrack = () => {
  if (!tracks || tracks.length === 0) return;

  if (history.value.length > 0) {
    const prevIdx = history.value.pop()!;
    currentTrackIndex.value = prevIdx;
    return;
  }

  currentTrackIndex.value =
    (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
};

const handleNext = () => switchTrack(nextTrack);
const handlePrev = () => switchTrack(prevTrack);

const setTrackIndex = (index: number) => {
  if (!tracks || tracks.length === 0) return;
  if (index < 0 || index >= tracks.length) return;
  initialTrackPicked = true;
  if (currentTrackIndex.value !== index) {
    history.value.push(currentTrackIndex.value);
    if (history.value.length > 50) history.value.shift();
  }
  currentTrackIndex.value = index;
};

/**
 * Curated list of XM tracks for the initial load selection.
 * Keeps the initial music experience to high-quality selections.
 */
export const INITIAL_TRACK_FILENAMES: readonly string[] = [
  'TSRh-Xi-soft-NetXfer-2.55.392-crk.xm',
  'uCF-Real7ime-Converte-intro.xm',
  'uCF-TeleportPro-kg.xm',
  'uCF-ZoneAlarm-Pro-3.0.2.6-kg.xm',
  'uCF-ZoneAlarm-Pro-3.1.395-kg.xm',
  'Under-SEH-File-And-Folder-Protector-3.2-crk.xm',
  'Under-SEH-MediaMonkey-3.2.1.1297-kg.xm',
  'Under-SEH-Registry-Winner-5.2.4.24-crk.xm',
  'Under-SEH-ZealotSoft-All-Video-Splitter-4.3.2-crk.xm',
  'UnderPL-Plato-DVD-Creator-3.39-kg.xm',
  'UP7-PDF2CAD-6.0-crk.xm',
  'VORONEZH-Hex-Editor-Neo-6.10-crk.xm',
  'X.O-Alive-DVD-Ripper-2.2.3.6-serial-fish.xm',
  'x3chun-Liatro-SWF-Decoder-4.5-kg.xm',
  'ZWT-RamDisk-Plus-10.0.1-kg.xm'
];

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
  if (!tracks || tracks.length === 0) return;

  const initialSet = new Set(
    INITIAL_TRACK_FILENAMES.map((f) => f.toLowerCase())
  );
  const candidates: number[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const filename = tracks[i]?.filename?.toLowerCase();
    if (filename && initialSet.has(filename)) {
      candidates.push(i);
    }
  }

  if (candidates.length > 0) {
    const chosenIndex =
      candidates[Math.floor(Math.random() * candidates.length)];
    currentTrackIndex.value = chosenIndex;
  } else {
    currentTrackIndex.value = Math.floor(Math.random() * tracks.length);
  }
};

const selectTrack = (originalIndex: number) => {
  initialTrackPicked = true;
  if (currentTrackIndex.value === originalIndex && isPlaying.value) return;
  switchTrack(() => setTrackIndex(originalIndex));
};

const applyTrackQueryParam = (search?: string) => {
  const queryStr =
    search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(queryStr);
  const trackParam = params.get('track');
  const matchIdx = trackParam
    ? tracks.findIndex(
        (t) =>
          t.filename === trackParam ||
          t.filename.toLowerCase() === trackParam.toLowerCase()
      )
    : -1;
  if (matchIdx !== -1) {
    selectTrack(matchIdx);
  } else {
    pickRandomInitialTrack();
  }
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
  isSplatVisible,
  isShuffle,
  history,
  liveSongTitle,

  // Favorites & Title
  FAVORITES_STORAGE_KEY,
  favorites,
  loadFavorites,
  saveFavorites,
  isCurrentFavorite,
  toggleFavorite,
  cleanTitle,
  applyTrackQueryParam,

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
