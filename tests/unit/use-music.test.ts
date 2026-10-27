// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../data/music.data', () => ({
  data: [
    { filename: 'track1.xm', url: '/audio/track1.xm', title: 'Track 1' },
    { filename: 'track2.xm', url: '/audio/track2.xm', title: 'Track 2' },
    {
      filename: 'uCF-TeleportPro-kg.xm',
      url: '/audio/uCF-TeleportPro-kg.xm',
      title: 'Toilet Story 5'
    }
  ]
}));

import defaultUseMusic, {
  INITIAL_TRACK_FILENAMES,
  FAVORITES_STORAGE_KEY,
  cleanTitle,
  useMusic
} from '../../.vitepress/theme/composables/useMusic';

describe('useMusic composable', () => {
  beforeEach(() => {
    const music = useMusic();
    music.resetInitialTrackPicked();
    music.setPlaying(false);
    music.currentTrackIndex.value = 0;
    music.setSplatVisible(false);
    music.isShuffle.value = false;
    music.history.value = [];
    music.favorites.value = new Set();
  });

  it('exports default and named useMusic returning identical singleton state', () => {
    expect(defaultUseMusic).toBe(useMusic);

    const instanceA = useMusic();
    const instanceB = defaultUseMusic();

    expect(instanceA).toBe(instanceB);
    expect(instanceA.isPlaying).toBe(instanceB.isPlaying);
    expect(instanceA.currentTrackIndex).toBe(instanceB.currentTrackIndex);
  });

  it('shares reactive state across multiple invocations', () => {
    const a = useMusic();
    const b = useMusic();

    expect(a.isRepeat.value).toBe(false);
    expect(b.isRepeat.value).toBe(false);

    a.toggleRepeat();
    expect(b.isRepeat.value).toBe(true);

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

  it('selects initial track from curated list on load', () => {
    const { pickRandomInitialTrack, currentTrackIndex } = useMusic();

    expect(INITIAL_TRACK_FILENAMES.length).toBe(15);
    expect(INITIAL_TRACK_FILENAMES).toContain('uCF-TeleportPro-kg.xm');

    expect(currentTrackIndex.value).toBe(0);
    pickRandomInitialTrack();
    // In mock data, only track index 2 ('uCF-TeleportPro-kg.xm') is in INITIAL_TRACK_FILENAMES
    expect(currentTrackIndex.value).toBe(2);

    // Should not re-pick when already picked
    currentTrackIndex.value = 1;
    pickRandomInitialTrack();
    expect(currentTrackIndex.value).toBe(1);

    // Can re-pick when force is true
    pickRandomInitialTrack(true);
    expect(currentTrackIndex.value).toBe(2);
  });

  it('does not change track if already playing when pickRandomInitialTrack is called', () => {
    const { pickRandomInitialTrack, currentTrackIndex, setPlaying } =
      useMusic();

    setPlaying(true);
    currentTrackIndex.value = 0;
    pickRandomInitialTrack();
    expect(currentTrackIndex.value).toBe(0);
  });

  describe('cleanTitle helper', () => {
    it('returns liveTitle when provided', () => {
      const { cleanTitle: stateCleanTitle } = useMusic();
      const track = {
        filename: 'file.xm',
        url: '/audio/file.xm',
        title: 'Static Title'
      };
      expect(cleanTitle(track, 'Live Title')).toBe('Live Title');
      expect(stateCleanTitle(track, 'Live Title')).toBe('Live Title');
    });

    it('returns track.title when liveTitle is empty or undefined', () => {
      const track = {
        filename: 'file.xm',
        url: '/audio/file.xm',
        title: 'Static Title'
      };
      expect(cleanTitle(track)).toBe('Static Title');
      expect(cleanTitle(track, '')).toBe('Static Title');
    });

    it('formats filename into readable title when track has no title', () => {
      const track = {
        filename: '01-justme-cool_track.xm',
        url: '/audio/01-justme-cool_track.xm',
        title: ''
      };
      expect(cleanTitle(track)).toBe('cool track');
    });

    it('falls back to "Unknown Track" when track is undefined or missing', () => {
      expect(cleanTitle()).toBe('Unknown Track');
      expect(cleanTitle({ filename: '', url: '', title: '' })).toBe(
        'Unknown Track'
      );
    });
  });

  describe('favorites management', () => {
    it('toggles favorites and updates isCurrentFavorite', () => {
      const {
        favorites,
        isCurrentFavorite,
        toggleFavorite,
        currentTrackIndex
      } = useMusic();

      expect(favorites.value.size).toBe(0);
      expect(isCurrentFavorite.value).toBe(false);

      // currentTrackIndex is 0 ('track1.xm')
      currentTrackIndex.value = 0;
      toggleFavorite();
      expect(favorites.value.has('track1.xm')).toBe(true);
      expect(isCurrentFavorite.value).toBe(true);

      // Toggle explicit filename
      toggleFavorite('track2.xm');
      expect(favorites.value.has('track2.xm')).toBe(true);
      expect(favorites.value.size).toBe(2);

      // Toggle current track off
      toggleFavorite();
      expect(favorites.value.has('track1.xm')).toBe(false);
      expect(isCurrentFavorite.value).toBe(false);
      expect(favorites.value.has('track2.xm')).toBe(true);
    });

    it('persists and loads favorites from localStorage when available', () => {
      const { loadFavorites, favorites, saveFavorites } = useMusic();
      const mockStorage: Record<string, string> = {};
      const storageMock = {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn()
      };
      vi.stubGlobal('localStorage', storageMock);

      favorites.value = new Set(['track1.xm', 'track2.xm']);
      saveFavorites();
      expect(storageMock.setItem).toHaveBeenCalledWith(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(['track1.xm', 'track2.xm'])
      );

      favorites.value = new Set();
      loadFavorites();
      expect(favorites.value.has('track1.xm')).toBe(true);
      expect(favorites.value.has('track2.xm')).toBe(true);

      vi.unstubAllGlobals();
    });
  });

  it('prevents pickRandomInitialTrack from overwriting track once setTrackIndex is called', () => {
    const { setTrackIndex, pickRandomInitialTrack, currentTrackIndex } =
      useMusic();

    expect(currentTrackIndex.value).toBe(0);
    // Explicitly set track 1
    setTrackIndex(1);
    expect(currentTrackIndex.value).toBe(1);

    // Should not overwrite with curated track index 2
    pickRandomInitialTrack();
    expect(currentTrackIndex.value).toBe(1);
  });

  describe('applyTrackQueryParam', () => {
    it('selects track matching ?track= parameter case-insensitively', () => {
      const { applyTrackQueryParam, currentTrackIndex } = useMusic();

      applyTrackQueryParam('?track=track2.xm');
      expect(currentTrackIndex.value).toBe(1);

      applyTrackQueryParam('?track=TRACK1.XM');
      expect(currentTrackIndex.value).toBe(0);
    });

    it('falls back to pickRandomInitialTrack when query param is absent or invalid', () => {
      const {
        applyTrackQueryParam,
        currentTrackIndex,
        resetInitialTrackPicked
      } = useMusic();

      // Absent query param -> picks curated track (uCF-TeleportPro-kg.xm = index 2)
      applyTrackQueryParam('');
      expect(currentTrackIndex.value).toBe(2);

      // Reset and try invalid track name
      resetInitialTrackPicked();
      currentTrackIndex.value = 0;
      applyTrackQueryParam('?track=nonexistent.xm');
      expect(currentTrackIndex.value).toBe(2);
    });
  });

  describe('setScopesEnabled', () => {
    it('enables and disables scopes, clearing channelScopes when disabled', () => {
      const { setScopesEnabled, channelScopes } = useMusic();

      channelScopes.value = [new Float32Array(64)];
      expect(channelScopes.value.length).toBe(1);

      setScopesEnabled(false);
      expect(channelScopes.value.length).toBe(0);

      setScopesEnabled(true);
      expect(channelScopes.value.length).toBe(0);
    });
  });
});
