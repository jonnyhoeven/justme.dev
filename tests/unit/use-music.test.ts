import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../data/music.data', () => ({
  data: [
    { filename: 'track1.xm', url: '/audio/track1.xm', title: 'Track 1' },
    { filename: 'track2.xm', url: '/audio/track2.xm', title: 'Track 2' },
    { filename: 'track3.xm', url: '/audio/track3.xm', title: 'Track 3' }
  ]
}));

import defaultUseMusic, {
  useMusic
} from '../../.vitepress/theme/composables/useMusic';

describe('useMusic composable', () => {
  beforeEach(() => {
    const music = useMusic();
    music.isMusicVisible.value = false;
    music.setPlaying(false);
    music.currentTrackIndex.value = 0;
    music.setCurrentTime(0);
    music.setSplatVisible(false);
    music.isShuffle.value = false;
    music.history.value = [];
  });

  it('exports default and named useMusic returning identical singleton state', () => {
    expect(defaultUseMusic).toBe(useMusic);

    const instanceA = useMusic();
    const instanceB = defaultUseMusic();

    expect(instanceA).toBe(instanceB);
    expect(instanceA.isMusicVisible).toBe(instanceB.isMusicVisible);
    expect(instanceA.isPlaying).toBe(instanceB.isPlaying);
    expect(instanceA.currentTrackIndex).toBe(instanceB.currentTrackIndex);
  });

  it('shares reactive state across multiple invocations', () => {
    const a = useMusic();
    const b = useMusic();

    expect(a.isMusicVisible.value).toBe(false);
    expect(b.isMusicVisible.value).toBe(false);

    a.toggleVisibility();
    expect(b.isMusicVisible.value).toBe(true);

    b.setPlaying(true);
    expect(a.isPlaying.value).toBe(true);

    const testAudioData = new Uint8Array([1, 2, 3]);
    a.setAudioData(testAudioData);
    expect(b.audioData.value).toBe(testAudioData);

    b.setPlaying(false);
    expect(a.audioData.value).toBeNull();
  });

  it('cycles track index with nextTrack and prevTrack', () => {
    const { nextTrack, prevTrack, currentTrackIndex, tracks } = useMusic();

    expect(currentTrackIndex.value).toBe(0);
    expect(tracks.length).toBe(3);

    nextTrack();
    expect(currentTrackIndex.value).toBe(1);

    nextTrack();
    expect(currentTrackIndex.value).toBe(2);

    nextTrack();
    expect(currentTrackIndex.value).toBe(0);

    prevTrack();
    expect(currentTrackIndex.value).toBe(2);

    prevTrack();
    expect(currentTrackIndex.value).toBe(1);
  });

  it('handles shuffle mode and tracks navigation history', () => {
    const {
      toggleShuffle,
      isShuffle,
      nextTrack,
      prevTrack,
      setTrackIndex,
      currentTrackIndex,
      history
    } = useMusic();

    expect(isShuffle.value).toBe(false);
    toggleShuffle();
    expect(isShuffle.value).toBe(true);

    const initial = currentTrackIndex.value;
    nextTrack();
    // After moving to next track, initial index is in history
    expect(history.value).toContain(initial);

    // prevTrack pops from history
    prevTrack();
    expect(currentTrackIndex.value).toBe(initial);

    // direct index selection
    setTrackIndex(2);
    expect(currentTrackIndex.value).toBe(2);
    prevTrack();
    expect(currentTrackIndex.value).toBe(initial);

    toggleShuffle();
    expect(isShuffle.value).toBe(false);
  });
});
