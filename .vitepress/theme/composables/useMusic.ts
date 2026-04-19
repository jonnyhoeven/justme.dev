import { ref } from 'vue';

// Shared state for the music player easter egg
export const useMusic = () => {
  // Static state (singleton pattern)
  const isMusicVisible = ref(false);
  const isPlaying = ref(false);
  const audioData = ref<Uint8Array | null>(null);
  const currentTrackIndex = ref(0);
  const tracks = ['Sappheiros - Dawn.mp3', 'Tokyowalker4 - Way Home by.mp3'];

  // Actions
  const toggleVisibility = () => {
    isMusicVisible.value = !isMusicVisible.value;
  };

  const setAudioData = (data: Uint8Array) => {
    audioData.value = data;
  };

  const setPlaying = (val: boolean) => {
    isPlaying.value = val;
  };

  const nextTrack = () => {
    currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.length;
  };

  const prevTrack = () => {
    currentTrackIndex.value =
      (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
  };

  return {
    isMusicVisible,
    isPlaying,
    audioData,
    currentTrackIndex,
    tracks,
    toggleVisibility,
    setAudioData,
    setPlaying,
    nextTrack,
    prevTrack
  };
};

// Singleton instance to share state across components
const musicState = useMusic();
export default () => musicState;
