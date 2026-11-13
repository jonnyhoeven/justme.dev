// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';

const { INITIAL_MOCK } = vi.hoisted(() => ({
  INITIAL_MOCK: [
    ['alpha.xm', 'Alpha Song'],
    ['beta.xm', 'Beta Tune'],
    ['uCF-TeleportPro-kg.xm', 'Toilet Story 5']
  ]
}));

vi.mock('../../data/music-initial.data', () => ({
  data: { trackers: [], tracks: INITIAL_MOCK }
}));

vi.mock('../../data/music.data', () => ({
  data: {
    trackers: [],
    tracks: [...INITIAL_MOCK, ['gamma.xm', 'Gamma Ray']]
  }
}));

import useMusic from '../../.vitepress/theme/composables/useMusic';
import usePlaylist from '../../.vitepress/theme/composables/usePlaylist';

const setup = () => {
  const scope = effectScope();
  const playlist = scope.run(() =>
    usePlaylist({ itemHeight: 40, overscan: 2 })
  )!;
  return playlist;
};

describe('usePlaylist', () => {
  beforeEach(() => {
    const music = useMusic();
    music.resetCatalog();
    music.favorites.value = new Set();
    music.ratings.value = {};
  });

  it('lists every track by default with original indices', () => {
    const { filteredTracks, indexedTracks } = setup();
    const n = useMusic().tracks.value.length;
    expect(indexedTracks.value).toHaveLength(n);
    expect(filteredTracks.value.map((i) => i.originalIndex)).toEqual([
      ...Array(n).keys()
    ]);
  });

  it('filters by a trimmed, case-insensitive query on title or filename', () => {
    const { filteredTracks, searchQuery } = setup();
    searchQuery.value = '  BETA ';
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'beta.xm'
    ]);
    searchQuery.value = 'gamma';
    expect(filteredTracks.value).toHaveLength(0);
  });

  it('filters favourites only and combines with search', () => {
    const music = useMusic();
    const { filteredTracks, searchQuery, onlyFavorites } = setup();
    music.favorites.value = new Set(['alpha.xm', 'beta.xm']);
    onlyFavorites.value = true;
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'alpha.xm',
      'beta.xm'
    ]);
    searchQuery.value = 'alp';
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'alpha.xm'
    ]);
  });

  it('filters by minimum star rating and combines with search', () => {
    const music = useMusic();
    const { filteredTracks, minRating, searchQuery } = setup();
    music.setRating(3, 'alpha.xm');
    music.setRating(5, 'beta.xm');

    minRating.value = 4;
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'beta.xm'
    ]);

    minRating.value = 3;
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'alpha.xm',
      'beta.xm'
    ]);

    searchQuery.value = 'alpha';
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'alpha.xm'
    ]);

    minRating.value = 0;
    searchQuery.value = '';
    expect(filteredTracks.value).toHaveLength(3);
  });

  it('sorts tracks by star rating descending with tie-break on original index', () => {
    const music = useMusic();
    const { filteredTracks, sortByRating } = setup();
    music.setRating(2, 'alpha.xm');
    music.setRating(5, 'beta.xm');
    // uCF-TeleportPro-kg.xm is unrated (0)

    sortByRating.value = true;
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'beta.xm',
      'alpha.xm',
      'uCF-TeleportPro-kg.xm'
    ]);

    // Same rating tie-breaks by original index
    music.setRating(5, 'alpha.xm');
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'alpha.xm',
      'beta.xm',
      'uCF-TeleportPro-kg.xm'
    ]);
  });

  it('reacts when the catalog swaps the tracks array', async () => {
    const music = useMusic();
    const { filteredTracks, searchQuery } = setup();
    searchQuery.value = 'gamma';
    expect(filteredTracks.value).toHaveLength(0);
    await music.ensureCatalog();
    expect(filteredTracks.value.map((i) => i.track.filename)).toEqual([
      'gamma.xm'
    ]);
  });

  it('resets scroll when the filter changes', async () => {
    const { searchQuery, minRating, sortByRating, containerProps } = setup();
    const el = { scrollTop: 120, scrollTo: vi.fn() } as unknown as HTMLElement;
    containerProps.ref.value = el;

    searchQuery.value = 'a';
    await nextTick();
    expect(el.scrollTop).toBe(0);

    el.scrollTop = 80;
    minRating.value = 3;
    await nextTick();
    expect(el.scrollTop).toBe(0);

    el.scrollTop = 50;
    sortByRating.value = true;
    await nextTick();
    expect(el.scrollTop).toBe(0);
  });
});

describe('initMusicOnce', () => {
  beforeEach(() => {
    useMusic().resetMusicInit();
    vi.restoreAllMocks();
  });

  it('loads favourites and applies the query param only once', () => {
    const music = useMusic();
    const getItem = vi.fn(() => JSON.stringify(['alpha.xm']));
    vi.stubGlobal('localStorage', { getItem, setItem: vi.fn() });
    vi.stubGlobal('window', { location: { search: '?track=beta.xm' } });
    try {
      music.initMusicOnce();
      music.initMusicOnce();
      expect(getItem).toHaveBeenCalledTimes(2);
      expect(music.favorites.value.has('alpha.xm')).toBe(true);
      music.resetMusicInit();
      music.initMusicOnce();
      expect(getItem).toHaveBeenCalledTimes(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
