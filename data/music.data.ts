// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import path from 'node:path';
import { defineLoader } from 'vitepress';

export interface MusicTrack {
  filename: string;
  url: string;
  title: string;
  channels?: number;
  bpm?: number;
  tracker?: string;
}

declare const data: MusicTrack[];
export { data };

export default defineLoader({
  watch: ['../data/music-tracks.json'],
  load(): MusicTrack[] {
    const catalogPath = path.resolve(__dirname, '../data/music-tracks.json');
    if (!fs.existsSync(catalogPath)) return [];

    try {
      const raw = fs.readFileSync(catalogPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .sort((a, b) =>
            a.filename.localeCompare(b.filename, undefined, {
              numeric: true,
              sensitivity: 'base'
            })
          )
          .map((entry) => ({
            filename: entry.filename,
            url: entry.url,
            title: entry.title,
            ...(entry.channels ? { channels: entry.channels } : {}),
            ...(entry.bpm ? { bpm: entry.bpm } : {}),
            ...(entry.tracker ? { tracker: entry.tracker } : {})
          }));
      }
    } catch {
      // Fallback to empty array if JSON is corrupted or invalid
    }

    return [];
  }
});
