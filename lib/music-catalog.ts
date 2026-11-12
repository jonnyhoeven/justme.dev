// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { SITE_CONSTANTS } from '../.vitepress/constants';

export interface MusicTrack {
  filename: string;
  url: string;
  title: string;
  channels?: number;
  bpm?: number;
  tracker?: string;
}

/** Column order of a compact track row (matches `fields` in the v2 JSON). */
export const CATALOG_FIELDS = [
  'filename',
  'title',
  'channels',
  'bpm',
  'tracker'
] as const;

/**
 * `[filename, title, channels, bpm, trackerIndex]`. Missing values are `null`
 * (or the row is simply shorter); `trackerIndex` points into `trackers`.
 */
export type CompactTrack = [
  string,
  string,
  (number | null)?,
  (number | null)?,
  (number | null)?
];

export interface CompactCatalog {
  trackers: string[];
  tracks: CompactTrack[];
}

/** Rebuild full `MusicTrack`s; `url` is derived from the media base URL. */
export function expandCatalog(
  catalog: CompactCatalog,
  mediaUrl: string = SITE_CONSTANTS.MEDIA_URL
): MusicTrack[] {
  return catalog.tracks.map(([filename, title, channels, bpm, tracker]) => ({
    filename,
    url: `${mediaUrl}/audio/${filename}`,
    title,
    ...(channels ? { channels } : {}),
    ...(bpm ? { bpm } : {}),
    ...(tracker != null && catalog.trackers[tracker]
      ? { tracker: catalog.trackers[tracker] }
      : {})
  }));
}
