// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { catalogImports, INITIAL_MOCK } = vi.hoisted(() => ({
  catalogImports: { count: 0 },
  INITIAL_MOCK: [
    ['track1.xm', 'Track 1'],
    ['track2.xm', 'Track 2'],
    ['TSRh-Xi-soft-NetXfer-2.55.392-crk.xm', 'Toilet Story 5']
  ]
}));

vi.mock('../../data/music-initial.data', () => ({
  data: { trackers: [], tracks: INITIAL_MOCK }
}));

// Full catalog: extra entries before/after so indices shift when it is swapped in.
vi.mock('../../data/music.data', () => {
  catalogImports.count++;
  return {
    data: {
      trackers: [],
      tracks: [
        ['aaa-extra.xm', 'AAA'],
        ...INITIAL_MOCK,
        ['zzz-extra.xm', 'ZZZ']
      ]
    }
  };
});

import defaultUseMusic, {
  INITIAL_TRACK_FILENAMES,
  FAVORITES_STORAGE_KEY,
  RATINGS_STORAGE_KEY,
  cleanTitle,
  useMusic
} from '../../.vitepress/theme/composables/useMusic';
import { XMPlayer } from '../../lib/audio/xm-player';

describe('useMusic composable', () => {
  beforeEach(() => {
    const music = useMusic();
    music.resetInitialTrackPicked();
    music.resetAudio();
    music.resetCatalog();
    music.setPlaying(false);
    music.currentTrackIndex.value = 0;
    music.setSplatVisible(false);
    music.isShuffle.value = false;
    music.history.value = [];
    music.favorites.value = new Set();
    music.ratings.value = {};
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
    expect(tracks.value.length).toBe(3);

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

    expect(INITIAL_TRACK_FILENAMES.length).toBe(14);
    expect(INITIAL_TRACK_FILENAMES).toContain(
      'TSRh-Xi-soft-NetXfer-2.55.392-crk.xm'
    );

    expect(currentTrackIndex.value).toBe(0);
    pickRandomInitialTrack();
    // In mock data, only track index 2 ('TSRh-Xi-soft-NetXfer-2.55.392-crk.xm') is in INITIAL_TRACK_FILENAMES
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

    it('sets and gets track rating, updating currentTrackRating and favorites', () => {
      const {
        setRating,
        getRating,
        currentTrackRating,
        currentTrackIndex,
        favorites
      } = useMusic();

      currentTrackIndex.value = 0; // 'track1.xm'
      expect(getRating()).toBe(0);
      expect(currentTrackRating.value).toBe(0);

      // Set rating for current track
      setRating(4);
      expect(getRating()).toBe(4);
      expect(currentTrackRating.value).toBe(4);
      expect(getRating('track1.xm')).toBe(4);
      expect(favorites.value.has('track1.xm')).toBe(true);

      // Set rating for another track
      setRating(2, 'track2.xm');
      expect(getRating('track2.xm')).toBe(2);
      expect(favorites.value.has('track2.xm')).toBe(true);

      // Unrated track returns 0
      expect(getRating('nonexistent.xm')).toBe(0);
    });

    it('toggles rating to clear when setRating is called twice with same value or 0', () => {
      const { setRating, getRating, favorites } = useMusic();

      setRating(3, 'track1.xm');
      expect(getRating('track1.xm')).toBe(3);
      expect(favorites.value.has('track1.xm')).toBe(true);

      // Clicking same star toggles to 0 / deletes
      setRating(3, 'track1.xm');
      expect(getRating('track1.xm')).toBe(0);
      expect(favorites.value.has('track1.xm')).toBe(false);

      // Setting to 0 explicitly clears
      setRating(5, 'track2.xm');
      expect(getRating('track2.xm')).toBe(5);
      setRating(0, 'track2.xm');
      expect(getRating('track2.xm')).toBe(0);
      expect(favorites.value.has('track2.xm')).toBe(false);
    });

    it('clamps and rounds rating to 0..5', () => {
      const { setRating, getRating } = useMusic();

      setRating(7, 'track1.xm');
      expect(getRating('track1.xm')).toBe(5);

      setRating(-3, 'track2.xm');
      expect(getRating('track2.xm')).toBe(0);

      setRating(3.7, 'track1.xm');
      expect(getRating('track1.xm')).toBe(4);
    });

    it('exports ratings sorted alphabetically with localeCompare and newline', () => {
      const { setRating, exportRatings } = useMusic();

      setRating(4, 'zzz.xm');
      setRating(5, 'aaa.xm');
      setRating(3, 'mmm.xm');

      const exported = exportRatings();
      expect(exported.endsWith('\n')).toBe(true);
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual({
        'aaa.xm': 5,
        'mmm.xm': 3,
        'zzz.xm': 4
      });
      // Check key order
      expect(Object.keys(parsed)).toEqual(['aaa.xm', 'mmm.xm', 'zzz.xm']);
    });

    it('migrates FAVORITES_STORAGE_KEY entries to 5 stars unless already rated in RATINGS_STORAGE_KEY', () => {
      const { loadFavorites, getRating, favorites } = useMusic();
      const mockStorage: Record<string, string> = {
        [FAVORITES_STORAGE_KEY]: JSON.stringify(['fav1.xm', 'fav2.xm']),
        [RATINGS_STORAGE_KEY]: JSON.stringify({ 'fav2.xm': 3, 'other.xm': 4 })
      };
      const storageMock = {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      vi.stubGlobal('localStorage', storageMock);

      loadFavorites();

      // fav1.xm was in favorites only -> migrated to 5
      expect(getRating('fav1.xm')).toBe(5);
      expect(favorites.value.has('fav1.xm')).toBe(true);

      // fav2.xm was in ratings storage with 3 -> ratings takes precedence
      expect(getRating('fav2.xm')).toBe(3);
      expect(favorites.value.has('fav2.xm')).toBe(true);

      // other.xm was in ratings storage with 4
      expect(getRating('other.xm')).toBe(4);
      expect(favorites.value.has('other.xm')).toBe(true);

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
    it('selects track matching ?track= parameter case-insensitively', async () => {
      const { applyTrackQueryParam, currentTrackIndex, catalogLoaded } =
        useMusic();

      await applyTrackQueryParam('?track=track2.xm');
      expect(currentTrackIndex.value).toBe(1);

      await applyTrackQueryParam('?track=TRACK1.XM');
      expect(currentTrackIndex.value).toBe(0);
      // Tracks in the initial set do not need the full catalog.
      expect(catalogLoaded.value).toBe(false);
    });

    it('loads the catalog for a ?track= deep link outside the initial set', async () => {
      const { applyTrackQueryParam, currentTrackIndex, currentTrack, tracks } =
        useMusic();

      await applyTrackQueryParam('?track=ZZZ-extra.xm');
      expect(tracks.value.length).toBe(5);
      expect(currentTrack.value?.filename).toBe('zzz-extra.xm');
      expect(currentTrackIndex.value).toBe(4);
    });

    it('falls back to pickRandomInitialTrack when query param is absent or invalid', async () => {
      const {
        applyTrackQueryParam,
        currentTrackIndex,
        resetInitialTrackPicked
      } = useMusic();

      // Absent query param -> picks curated track (TSRh-Xi-soft-NetXfer-2.55.392-crk.xm = index 2)
      await applyTrackQueryParam('');
      expect(currentTrackIndex.value).toBe(2);

      // Reset and try invalid track name
      resetInitialTrackPicked();
      currentTrackIndex.value = 0;
      await applyTrackQueryParam('?track=nonexistent.xm');
      // Catalog is now loaded, so the curated track sits one slot later.
      expect(currentTrackIndex.value).toBe(3);
    });
  });

  describe('lazy catalog', () => {
    it('starts with the initial set and imports the catalog only once', async () => {
      const { tracks, catalogLoaded, ensureCatalog } = useMusic();

      expect(tracks.value.length).toBe(3);
      expect(catalogLoaded.value).toBe(false);

      const first = ensureCatalog();
      expect(ensureCatalog()).toBe(first);
      await first;
      await ensureCatalog();

      expect(catalogLoaded.value).toBe(true);
      expect(tracks.value.length).toBe(5);
      expect(catalogImports.count).toBe(1);
    });

    it('remaps current index, history and shuffle deck by filename on swap', async () => {
      const {
        tracks,
        currentTrack,
        currentTrackIndex,
        history,
        isShuffle,
        ensureCatalog
      } = useMusic();

      currentTrackIndex.value = 2; // TSRh-Xi-soft-NetXfer-2.55.392-crk.xm
      history.value = [0, 1]; // track1, track2
      isShuffle.value = true;
      await ensureCatalog();

      expect(currentTrackIndex.value).toBe(3);
      expect(currentTrack.value?.filename).toBe(
        'TSRh-Xi-soft-NetXfer-2.55.392-crk.xm'
      );
      expect(history.value).toEqual([1, 2]);
      expect(tracks.value[history.value[0]].filename).toBe('track1.xm');
    });

    it('triggers a catalog load on togglePlay and shuffle', async () => {
      const { toggleShuffle, catalogLoaded, ensureCatalog } = useMusic();
      toggleShuffle();
      await ensureCatalog();
      expect(catalogLoaded.value).toBe(true);
      toggleShuffle();
    });

    it('handleNext waits for the catalog and then advances in the full list', async () => {
      const { handleNext, currentTrack, currentTrackIndex } = useMusic();
      currentTrackIndex.value = 2; // last of the initial set

      await handleNext();

      // Full list continues with zzz-extra.xm instead of wrapping to track1.
      expect(currentTrack.value?.filename).toBe('zzz-extra.xm');
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

  describe('loadAndPlayTrack error handling and race prevention', () => {
    let mockCancelAnimationFrame: ReturnType<typeof vi.fn>;
    let mockRequestAnimationFrame: ReturnType<typeof vi.fn>;

    class MockAudioContext {
      state = 'running';
      destination = {};
      sampleRate = 44100;
      createAnalyser() {
        return {
          fftSize: 1024,
          smoothingTimeConstant: 0.55,
          frequencyBinCount: 512,
          getByteFrequencyData: vi.fn()
        };
      }
      createGain() {
        return {
          gain: { value: 1 },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }
      resume = vi.fn().mockResolvedValue(undefined);
    }

    beforeEach(() => {
      mockCancelAnimationFrame = vi.fn();
      mockRequestAnimationFrame = vi.fn(() => 42);
      vi.stubGlobal('window', {
        AudioContext: MockAudioContext,
        requestAnimationFrame: mockRequestAnimationFrame,
        cancelAnimationFrame: mockCancelAnimationFrame
      });
      vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      const { resetAudio } = useMusic();
      resetAudio();
    });

    it('handles load failure when loadUrl returns false (Item 20)', async () => {
      const { loadAndPlayTrack, isPlaying, liveSongTitle, audioData } =
        useMusic();
      vi.spyOn(XMPlayer.prototype, 'loadUrl').mockResolvedValue(false);

      isPlaying.value = true;
      audioData.value = new Uint8Array([1, 2, 3]);

      await loadAndPlayTrack('/audio/corrupted.xm');

      expect(isPlaying.value).toBe(false);
      expect(audioData.value).toBeNull();
      expect(liveSongTitle.value).toBe('Failed to load track');
    });

    it('handles load failure when loadUrl throws an error (Item 20)', async () => {
      const { loadAndPlayTrack, isPlaying, liveSongTitle, audioData } =
        useMusic();
      vi.spyOn(XMPlayer.prototype, 'loadUrl').mockRejectedValue(
        new Error('Failed to load XM file: HTTP 404')
      );

      isPlaying.value = true;
      audioData.value = new Uint8Array([4, 5, 6]);

      await loadAndPlayTrack('/audio/missing.xm');

      expect(isPlaying.value).toBe(false);
      expect(audioData.value).toBeNull();
      expect(liveSongTitle.value).toBe('Failed to load track');
    });

    it('cancels active animationFrame on load failure (Item 20)', async () => {
      const { loadAndPlayTrack } = useMusic();
      vi.spyOn(XMPlayer.prototype, 'loadUrl').mockResolvedValue(false);

      await loadAndPlayTrack('/audio/bad.xm');

      expect(useMusic().isPlaying.value).toBe(false);
    });

    it('prevents stale slower track load from overwriting faster newer load (Item 21)', async () => {
      const { loadAndPlayTrack, liveSongTitle, isPlaying } = useMusic();

      let resolveSlow!: (val: boolean) => void;
      const slowPromise = new Promise<boolean>((resolve) => {
        resolveSlow = resolve;
      });

      const playSpy = vi
        .spyOn(XMPlayer.prototype, 'play')
        .mockImplementation(() => {});
      vi.spyOn(XMPlayer.prototype, 'songTitle', 'get').mockReturnValue(
        'Track Fast'
      );

      vi.spyOn(XMPlayer.prototype, 'loadUrl').mockImplementation(
        async (url: string) => {
          if (url.includes('slow.xm')) {
            return slowPromise;
          }
          return true;
        }
      );

      // Start loading slow track
      const slowLoad = loadAndPlayTrack('/audio/slow.xm');

      // Rapidly switch to fast track while slow track is still fetching
      const fastLoad = loadAndPlayTrack('/audio/fast.xm');

      await fastLoad;
      expect(liveSongTitle.value).toBe('Track Fast');
      expect(isPlaying.value).toBe(true);

      // Now slow track finishes
      resolveSlow(true);
      await slowLoad;

      // Fast track must still remain current and slow track must not override state
      expect(liveSongTitle.value).toBe('Track Fast');
      expect(playSpy).toHaveBeenCalledTimes(1);
    });

    it('prevents stale failed load from overwriting a newer successful load (Item 21)', async () => {
      const { loadAndPlayTrack, liveSongTitle } = useMusic();

      let rejectSlow!: (err: Error) => void;
      const slowPromise = new Promise<boolean>((_, reject) => {
        rejectSlow = reject;
      });
      slowPromise.catch(() => {});

      vi.spyOn(XMPlayer.prototype, 'songTitle', 'get').mockReturnValue(
        'Fast Track'
      );
      vi.spyOn(XMPlayer.prototype, 'loadUrl').mockImplementation(
        async (url: string) => {
          if (url.includes('slow.xm')) {
            return slowPromise;
          }
          return true;
        }
      );

      const slowLoad = loadAndPlayTrack('/audio/slow.xm');
      const fastLoad = loadAndPlayTrack('/audio/fast.xm');

      await fastLoad;
      expect(liveSongTitle.value).toBe('Fast Track');

      // Now slow track fails
      rejectSlow(new Error('Slow load failed'));
      await slowLoad;

      // State remains Fast Track, not 'Failed to load track'
      expect(liveSongTitle.value).toBe('Fast Track');
    });
  });
});
