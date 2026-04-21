import { ref } from 'vue';
import { SITE_CONSTANTS } from '../../constants';

// Shared state for the music player easter egg
export const useMusic = () => {
  // Static state (singleton pattern)
  const isMusicVisible = ref(false);
  const isPlaying = ref(false);
  const audioData = ref<Uint8Array | null>(null);
  const currentTrackIndex = ref(0);
  const currentTime = ref(0);
  const tracks = SITE_CONSTANTS.MUSIC_TRACKS;
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
    currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length;
    currentTime.value = 0;
  };

  const prevTrack = () => {
    currentTrackIndex.value =
      (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
    currentTime.value = 0;
  };

  return {
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
};

// Singleton instance to share state across components
const musicState = useMusic();
export default () => musicState;
