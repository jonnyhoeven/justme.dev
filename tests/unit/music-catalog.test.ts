// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { expandCatalog } from '../../lib/music-catalog';

describe('expandCatalog', () => {
  const catalog = {
    trackers: ['FastTracker v2.00', 'MilkyTracker'],
    tracks: [
      ['a.xm', 'A', 8, 125, 0],
      ['b.xm', 'B', null, null, 1],
      ['c.xm', 'C']
    ] as [
      string,
      string,
      (number | null)?,
      (number | null)?,
      (number | null)?
    ][]
  };

  it('derives urls from the media base and restores optional fields', () => {
    expect(expandCatalog(catalog, 'https://m.test')).toEqual([
      {
        filename: 'a.xm',
        url: 'https://m.test/audio/a.xm',
        title: 'A',
        channels: 8,
        bpm: 125,
        tracker: 'FastTracker v2.00'
      },
      {
        filename: 'b.xm',
        url: 'https://m.test/audio/b.xm',
        title: 'B',
        tracker: 'MilkyTracker'
      },
      { filename: 'c.xm', url: 'https://m.test/audio/c.xm', title: 'C' }
    ]);
  });

  it('defaults to the site media URL and tolerates a bad tracker index', () => {
    const [t] = expandCatalog({
      trackers: [],
      tracks: [['x.xm', 'X', 1, 2, 5]]
    });
    expect(t.url).toBe('https://media.justme.dev/audio/x.xm');
    expect(t.tracker).toBeUndefined();
  });
});
