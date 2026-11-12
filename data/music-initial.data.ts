// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineLoader } from 'vitepress';
import { INITIAL_TRACK_FILENAMES } from './initial-tracks';
import { loadSortedCatalog, type MusicTrack } from './music-catalog-source';

declare const data: MusicTrack[];
export { data };

/**
 * Only the curated INITIAL_TRACK_FILENAMES entries of the catalog (same shape
 * and sort as `music.data.ts`). This is the part that loads eagerly. If none
 * of the curated names exist in the catalog, the first few entries are used so
 * the player still has something to start with.
 */
export default defineLoader({
  watch: ['../data/music-tracks.json'],
  load(): MusicTrack[] {
    const catalog = loadSortedCatalog();
    const wanted = new Set(INITIAL_TRACK_FILENAMES.map((f) => f.toLowerCase()));
    const initial = catalog.filter((t) => wanted.has(t.filename.toLowerCase()));
    return initial.length > 0
      ? initial
      : catalog.slice(0, INITIAL_TRACK_FILENAMES.length);
  }
});
