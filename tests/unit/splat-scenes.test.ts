import { describe, it, expect } from 'vitest';
import { FONT, LINES } from '../../lib/splat-scenes/sine-text';
import { scenes } from '../../lib/splat-scenes';

describe('sine text font', () => {
  it('has a glyph for every character except spaces', () => {
    const missing = [...new Set(LINES.join(''))].filter(
      (c) => c !== ' ' && !FONT[c]
    );
    expect(missing).toEqual([]);
  });

  it('defines every glyph as 7 rows of 5 columns', () => {
    for (const [char, glyph] of Object.entries(FONT)) {
      const rows = glyph.split('/');
      expect(rows, char).toHaveLength(7);
      for (const row of rows) expect(row, char).toHaveLength(5);
    }
  });
});

describe('scene registry', () => {
  it('has uniquely named scenes', () => {
    const names = scenes.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('animation registry', () => {
  it('has uniquely named animations', async () => {
    const { animations } = await import('../../lib/splat-animations');
    const names = animations.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
