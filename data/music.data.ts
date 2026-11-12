// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineLoader } from 'vitepress';
import type { CompactCatalog, MusicTrack } from '../lib/music-catalog';
import { loadCompactCatalog } from './music-catalog-source';

export type { MusicTrack };

declare const data: CompactCatalog;
export { data };

/**
 * The full catalog in compact form (tracker lookup table + tuples; the client
 * rebuilds `MusicTrack`s with `expandCatalog`). Large (thousands of tracks):
 * only import it dynamically (see `ensureCatalog` in useMusic). The small
 * curated set that ships with every page lives in `music-initial.data.ts`.
 */
export default defineLoader({
  watch: ['../data/music-tracks.json'],
  load(): CompactCatalog {
    return loadCompactCatalog();
  }
});
