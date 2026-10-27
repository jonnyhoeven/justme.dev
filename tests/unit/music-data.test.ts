// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import loader from '../../data/music.data';
import { INITIAL_TRACK_FILENAMES } from '../../.vitepress/theme/composables/useMusic';

describe('music.data loader', () => {
  it('loads tracks at build time from catalog or media bucket', () => {
    const tracks = loader.load();

    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);

    for (const track of tracks) {
      expect(track).toHaveProperty('filename');
      expect(track).toHaveProperty('url');
      expect(track).toHaveProperty('title');
      expect(track.filename.endsWith('.xm')).toBe(true);
      expect(
        track.url.startsWith('https://media.justme.dev/audio/') ||
          track.url.startsWith('/audio/')
      ).toBe(true);
      expect(typeof track.title).toBe('string');
      expect(track.title.length).toBeGreaterThan(0);
    }
  });

  it('lists tracks from catalog with tracker metadata', () => {
    const tracks = loader.load();
    const catalogPath = path.resolve(__dirname, '../../data/music-tracks.json');

    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      expect(tracks.map((t) => t.filename).sort()).toEqual(
        catalog.map((t: { filename: string }) => t.filename).sort()
      );
    }

    for (const track of tracks) {
      if (track.channels !== undefined) {
        expect(track.channels).toBeGreaterThan(0);
      }
      if (track.bpm !== undefined) {
        expect(track.bpm).toBeGreaterThan(0);
      }
      expect((track as Record<string, unknown>).path).toBeUndefined();
      expect((track as Record<string, unknown>).patterns).toBeUndefined();
    }
  });

  it('sorts tracks naturally using numeric ordering', () => {
    const tracks = loader.load();
    const filenames = tracks.map((t) => t.filename);
    const sorted = [...filenames].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    expect(filenames).toEqual(sorted);

    // Verify natural numeric comparator behavior on sample numbered files
    const sample = ['10_track.xm', '1_track.xm', '2_track.xm', '20_track.xm'];
    sample.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    expect(sample).toEqual([
      '1_track.xm',
      '2_track.xm',
      '10_track.xm',
      '20_track.xm'
    ]);
  });

  it('contains all curated initial tracks in the catalog', () => {
    const tracks = loader.load();
    const trackFilenameSet = new Set(
      tracks.map((t) => t.filename.toLowerCase())
    );

    for (const filename of INITIAL_TRACK_FILENAMES) {
      expect(
        trackFilenameSet.has(filename.toLowerCase()),
        `Expected ${filename} to exist in music catalog`
      ).toBe(true);
    }
  });
});
