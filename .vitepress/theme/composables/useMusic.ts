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

const nextTrack = () => {
  if (!tracks || tracks.length === 0) return;
  currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length;
  currentTime.value = 0;
};

const prevTrack = () => {
  if (!tracks || tracks.length === 0) return;
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
  toggleVisibility,
  setAudioData,
  setPlaying,
  setCurrentTime,
  setSplatVisible,
  nextTrack,
  prevTrack
};

// Shared state for the music player easter egg
export const useMusic = () => musicState;

export default useMusic;
