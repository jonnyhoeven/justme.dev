// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import path from 'node:path';
import {
  CATALOG_FIELDS,
  type CompactCatalog,
  type CompactTrack,
  type MusicTrack
} from '../lib/music-catalog';

export type { MusicTrack };

const byFilename = (a: CompactTrack, b: CompactTrack) =>
  a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });

/**
 * Read `music-tracks.json` (format v2, see `scripts/sync_audio_r2.py`) as a
 * compact catalog sorted by filename; empty when missing/invalid.
 */
export function loadCompactCatalog(): CompactCatalog {
  const empty: CompactCatalog = { trackers: [], tracks: [] };
  const catalogPath = path.resolve(__dirname, '../data/music-tracks.json');
  if (!fs.existsSync(catalogPath)) return empty;

  try {
    const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    if (
      parsed?.version === 2 &&
      Array.isArray(parsed.trackers) &&
      Array.isArray(parsed.tracks) &&
      JSON.stringify(parsed.fields) === JSON.stringify(CATALOG_FIELDS)
    ) {
      return {
        trackers: parsed.trackers,
        tracks: [...(parsed.tracks as CompactTrack[])].sort(byFilename)
      };
    }
  } catch {
    // Fallback to empty catalog if JSON is corrupted or invalid
  }

  return empty;
}
