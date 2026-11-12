// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineLoader } from 'vitepress';
import { loadSortedCatalog, type MusicTrack } from './music-catalog-source';

export type { MusicTrack };

declare const data: MusicTrack[];
export { data };

/**
 * The full catalog. Large (thousands of tracks): only import it dynamically
 * (see `ensureCatalog` in useMusic). The small curated set that ships with
 * every page lives in `music-initial.data.ts`.
 */
export default defineLoader({
  watch: ['../data/music-tracks.json'],
  load(): MusicTrack[] {
    return loadSortedCatalog();
  }
});
