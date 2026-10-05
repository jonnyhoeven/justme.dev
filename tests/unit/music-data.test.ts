import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import loader from '../../data/music.data';

describe('music.data loader', () => {
  it('loads tracks from public/audio/*.xm at build time', () => {
    const tracks = loader.load();

    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);

    for (const track of tracks) {
      expect(track).toHaveProperty('filename');
      expect(track).toHaveProperty('url');
      expect(track).toHaveProperty('title');
      expect(track.filename.endsWith('.xm')).toBe(true);
      expect(
        track.url.startsWith('/audio/') || track.url.includes('/audio/')
      ).toBe(true);
      expect(typeof track.title).toBe('string');
      expect(track.title.length).toBeGreaterThan(0);
    }
  });

  it('lists every .xm file in public/audio with tracker metadata', () => {
    const tracks = loader.load();
    const onDisk = fs
      .readdirSync(path.resolve(__dirname, '../../public/audio'))
      .filter((f) => f.toLowerCase().endsWith('.xm'));

    expect(tracks.map((t) => t.filename).sort()).toEqual([...onDisk].sort());

    for (const track of tracks) {
      if (track.channels !== undefined) {
        expect(track.channels).toBeGreaterThan(0);
      }
      if (track.bpm !== undefined) {
        expect(track.bpm).toBeGreaterThan(0);
      }
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
});
