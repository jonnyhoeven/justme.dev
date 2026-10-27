// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import path from 'node:path';
import { defineLoader } from 'vitepress';
import { decodeCp437Byte } from '../lib/audio/cp437';

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

function decodeCp437Bytes(bytes: Uint8Array): string {
  const chars: string[] = [];
  for (const byte of bytes) {
    if (byte === 0) break;
    chars.push(decodeCp437Byte(byte));
  }
  return chars.join('').trim();
}

export default defineLoader({
  watch: ['../data/music-tracks.json', '../public/audio/*.xm'],
  load(): MusicTrack[] {
    const catalogPath = path.resolve(__dirname, '../data/music-tracks.json');
    if (fs.existsSync(catalogPath)) {
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
        // Fallback to local files if JSON is corrupted or invalid
      }
    }

    const audioDir = path.resolve(__dirname, '../public/audio');
    if (!fs.existsSync(audioDir)) return [];

    return fs
      .readdirSync(audioDir)
      .filter((file) => file.toLowerCase().endsWith('.xm'))
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      )
      .map((file) => {
        let title = '';
        let tracker = '';
        let channels = 0;
        let bpm = 0;

        try {
          const buffer = fs.readFileSync(path.join(audioDir, file));
          if (buffer.length >= 80) {
            title = decodeCp437Bytes(buffer.subarray(17, 37));
            tracker = decodeCp437Bytes(buffer.subarray(38, 58));
            channels = buffer.readUInt16LE(68);
            bpm = buffer.readUInt16LE(78);
          }
        } catch {
          // ignore unreadable file
        }

        if (!title) {
          title = file
            .replace(/\.xm$/i, '')
            .replace(/^\d+[-_.\s]+/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }

        return {
          filename: file,
          url: `/audio/${file}`,
          title,
          ...(channels > 0 ? { channels } : {}),
          ...(bpm > 0 ? { bpm } : {}),
          ...(tracker ? { tracker } : {})
        };
      });
  }
});
