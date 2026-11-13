// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { ref, computed, watch } from 'vue';
import { useVirtualList } from '@vueuse/core';
import useMusic from './useMusic';
import type { MusicTrack } from '../../../lib/music-catalog';

export interface PlaylistItem {
  track: MusicTrack;
  originalIndex: number;
  displayTitle: string;
}

export interface PlaylistOptions {
  /** Row height in px for the virtual list. */
  itemHeight: number;
  /** Extra rows rendered outside the viewport (default 10). */
  overscan?: number;
}

/**
 * Search + favourites filtering and a virtualised list over the shared track
 * catalog. State (query, filter) is per call; tracks/favourites are shared.
 */
export const usePlaylist = ({ itemHeight, overscan = 10 }: PlaylistOptions) => {
  const { tracks, favorites, getRating, cleanTitle } = useMusic();

  const searchQuery = ref('');
  const onlyFavorites = ref(false);
  const minRating = ref<number>(0);
  const sortByRating = ref<boolean>(false);

  const indexedTracks = computed<PlaylistItem[]>(() =>
    tracks.value.map((track, originalIndex) => ({
      track,
      originalIndex,
      displayTitle: cleanTitle(track)
    }))
  );

  const filteredTracks = computed<PlaylistItem[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const favOnly = onlyFavorites.value;
    const minR = minRating.value;

    let result = indexedTracks.value;

    if (query || favOnly || minR > 0) {
      result = result.filter(({ track, displayTitle }) => {
        if (favOnly && !favorites.value.has(track.filename)) {
          return false;
        }
        if (minR > 0 && getRating(track.filename) < minR) {
          return false;
        }
        if (!query) return true;

        // Match title, cleaned title and filename
        const matchTitle = (track.title || '').toLowerCase().includes(query);
        const matchDisplay = displayTitle.toLowerCase().includes(query);
        const matchFile = (track.filename || '').toLowerCase().includes(query);
        return matchTitle || matchDisplay || matchFile;
      });
    }

    if (sortByRating.value) {
      result = [...result].sort(
        (a, b) =>
          getRating(b.track.filename) - getRating(a.track.filename) ||
          a.originalIndex - b.originalIndex
      );
    }

    return result;
  });

  // Virtualized list for 3000+ items
  const {
    list: virtualList,
    containerProps,
    wrapperProps,
    scrollTo
  } = useVirtualList(filteredTracks, { itemHeight, overscan });

  // Reset the scroll position when the filter changes so top items render
  watch([searchQuery, onlyFavorites, minRating, sortByRating], () => {
    if (containerProps.ref.value) {
      containerProps.ref.value.scrollTop = 0;
    }
    scrollTo(0);
  });

  return {
    searchQuery,
    onlyFavorites,
    minRating,
    sortByRating,
    indexedTracks,
    filteredTracks,
    virtualList,
    containerProps,
    wrapperProps,
    scrollTo
  };
};

export default usePlaylist;
