import { ref } from 'vue';
import { data as tracks } from '../../../data/music.data';

// Module-scoped reactive refs (shared singleton state)
const isMusicVisible = ref(false);
const isPlaying = ref(false);
const audioData = ref<Uint8Array | null>(null);
const currentTrackIndex = ref(0);
const currentTime = ref(0);
/** Set by HeroSplat when its canvas enters/exits the viewport. */
const isSplatVisible = ref(false);

// Shuffle & History state
const isShuffle = ref(false);
const shuffleDeck = ref<number[]>([]);
const history = ref<number[]>([]);

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

// Actions
const toggleVisibility = () => {
  isMusicVisible.value = !isMusicVisible.value;
};

const setAudioData = (data: Uint8Array | null) => {
  audioData.value = data;
};

const setPlaying = (val: boolean) => {
  isPlaying.value = val;
  if (!val) audioData.value = null;
};

const setCurrentTime = (val: number) => {
  currentTime.value = val;
};

const setSplatVisible = (val: boolean) => {
  isSplatVisible.value = val;
};

const setTrackIndex = (index: number) => {
  if (!tracks || tracks.length === 0) return;
  if (index < 0 || index >= tracks.length) return;
  if (currentTrackIndex.value !== index) {
    history.value.push(currentTrackIndex.value);
    if (history.value.length > 50) history.value.shift();
  }
  currentTrackIndex.value = index;
  currentTime.value = 0;
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
      currentTime.value = 0;
      return;
    }
  }

  currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length;
  currentTime.value = 0;
};

const prevTrack = () => {
  if (!tracks || tracks.length === 0) return;

  if (history.value.length > 0) {
    const prevIdx = history.value.pop()!;
    currentTrackIndex.value = prevIdx;
    currentTime.value = 0;
    return;
  }

  currentTrackIndex.value =
    (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
  currentTime.value = 0;
};

const musicState = {
  isMusicVisible,
  isPlaying,
  audioData,
  currentTrackIndex,
  currentTime,
  tracks,
  isSplatVisible,
  isShuffle,
  history,
  toggleVisibility,
  toggleShuffle,
  setAudioData,
  setPlaying,
  setCurrentTime,
  setSplatVisible,
  setTrackIndex,
  nextTrack,
  prevTrack
};

// Shared state for the music player easter egg
export const useMusic = () => musicState;

export default useMusic;
