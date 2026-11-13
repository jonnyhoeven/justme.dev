// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineLoader } from 'vitepress';
import type { CompactCatalog } from '../lib/music-catalog';
import { INITIAL_TRACK_FILENAMES } from './initial-tracks.ts';
import { loadCompactCatalog } from './music-catalog-source.ts';

declare const data: CompactCatalog;
export { data };

/**
 * Only the curated INITIAL_TRACK_FILENAMES entries of the catalog (same compact
 * shape and sort as `music.data.ts`). This is the part that loads eagerly. If
 * none of the curated names exist in the catalog, the first few entries are
 * used so the player still has something to start with.
 */
export default defineLoader({
  watch: ['../data/music-tracks.json'],
  load(): CompactCatalog {
    const catalog = loadCompactCatalog();
    const wanted = new Set(INITIAL_TRACK_FILENAMES.map((f) => f.toLowerCase()));
    const initial = catalog.tracks.filter((t) =>
      wanted.has(t[0].toLowerCase())
    );
    return {
      trackers: catalog.trackers,
      tracks:
        initial.length > 0
          ? initial
          : catalog.tracks.slice(0, INITIAL_TRACK_FILENAMES.length)
    };
  }
});
