import { describe, it, expect } from 'vitest';
import loader from '../../data/music.data';

describe('music.data loader', () => {
  it('loads tracks from public/audio/*.xm at build time', () => {
    const tracks = loader.load();

    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThanOrEqual(7);

    for (const track of tracks) {
      expect(track).toHaveProperty('filename');
      expect(track).toHaveProperty('url');
      expect(track).toHaveProperty('title');
      expect(track.filename.endsWith('.xm')).toBe(true);
      expect(track.url.startsWith('/audio/')).toBe(true);
      expect(typeof track.title).toBe('string');
      expect(track.title.length).toBeGreaterThan(0);
    }
  });

  it('correctly extracts titles and metadata from tracker files', () => {
    const tracks = loader.load();
    const purpleMotions = tracks.find(
      (t) => t.filename === '2_purple-motions.xm'
    );
    const butterfl = tracks.find((t) => t.filename === 'butterfl.xm');

    expect(purpleMotions).toBeDefined();
    expect(purpleMotions?.title).toBe('purple motions');
    expect(purpleMotions?.channels).toBe(12);
    expect(purpleMotions?.bpm).toBe(125);
    expect(purpleMotions?.tracker).toBe('FastTracker v2.00');

    expect(butterfl).toBeDefined();
    expect(butterfl?.title).toBe('Butterfly Flew Away');
    expect(butterfl?.channels).toBe(16);
    expect(butterfl?.bpm).toBe(140);
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
