// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import transformPage, {
  applyBlogStats,
  loadBlogStats
} from '../../lib/transformPage';

describe('transformPage', () => {
  it('supplies defaults when frontmatter is empty', () => {
    const result = transformPage({
      url: '/test',
      frontmatter: {}
    });

    expect(result.description).toBe(
      'Just me. Sharing insights, experiences, and tutorials related to software development and site reliability engineering.'
    );
    expect(result.frontmatter.title).toBe('Justme.dev');
    expect(result.frontmatter.intro).toBe('');
    expect(result.frontmatter.image).toBe(
      'https://media.justme.dev/images/justme.dev.webp'
    );
    expect(result.frontmatter.externalUrlLabel).toBe('View site');
    expect(result.frontmatter.langArr).toEqual([]);
    expect(result.url).toBe('/test');
  });

  it('derives externalUrl from gitlink', () => {
    const result = transformPage({
      url: '/project',
      frontmatter: {
        gitlink: 'https://github.com/myuser/myproject',
        user: 'myuser',
        project: 'myproject'
      }
    });

    expect(result.frontmatter.externalUrl).toBe(
      'https://github.com/myuser/myproject'
    );
    expect(result.frontmatter.externalUrlLabel).toBe('View on Github');
  });

  it('defaults externalUrlLabel to "View site" when externalUrl is non-GitHub even if gitlink is set', () => {
    const result = transformPage({
      url: '/project',
      frontmatter: {
        gitlink: 'https://github.com/cilium/cilium',
        externalUrl: 'https://cilium.io/'
      }
    });

    expect(result.frontmatter.externalUrl).toBe('https://cilium.io/');
    expect(result.frontmatter.externalUrlLabel).toBe('View site');
  });

  it('parses languages as comma-separated string or array', () => {
    const stringResult = transformPage({
      url: '/post1',
      frontmatter: {
        languages: 'TypeScript, Python, Vue'
      }
    });
    expect(stringResult.frontmatter.langArr).toEqual([
      'TypeScript',
      'Python',
      'Vue'
    ]);

    const arrayResult = transformPage({
      url: '/post2',
      frontmatter: {
        languages: ['Rust', 'Go']
      }
    });
    expect(arrayResult.frontmatter.langArr).toEqual(['Rust', 'Go']);
  });

  it('retains explicit title, image, and intro if provided', () => {
    const result = transformPage({
      url: '/custom',
      frontmatter: {
        title: 'Custom Title',
        image: '/custom.png',
        intro: 'Custom intro text'
      }
    });

    expect(result.frontmatter.title).toBe('Custom Title');
    expect(result.frontmatter.image).toBe('/custom.png');
    expect(result.frontmatter.intro).toBe('Custom intro text');
    expect(result.description).toBe('Custom intro text');
  });

  it('preserves explicit externalUrl and externalUrlLabel when provided', () => {
    const result = transformPage({
      url: '/game',
      frontmatter: {
        gitlink: 'https://git.example.com/org/game',
        externalUrl: 'https://game.example.com',
        externalUrlLabel: 'Play Game'
      }
    });

    expect(result.frontmatter.externalUrl).toBe('https://game.example.com');
    expect(result.frontmatter.externalUrlLabel).toBe('Play Game');
  });
});

describe('applyBlogStats', () => {
  it('merges stats when user and project match and stars is unset', () => {
    const pf = { user: 'cilium', project: 'cilium' };
    const statsMap = {
      'cilium/cilium': {
        stars: 19000,
        forks: 3000,
        watchers: 450,
        statsFetched: '2026-11-13'
      }
    };

    const result = applyBlogStats(pf, statsMap);
    expect(result.stars).toBe(19000);
    expect(result.forks).toBe(3000);
    expect(result.watchers).toBe(450);
    expect(result.statsFetched).toBe('2026-11-13');
  });

  it('does not overwrite explicit stars', () => {
    const pf = { user: 'cilium', project: 'cilium', stars: 99999 };
    const statsMap = {
      'cilium/cilium': {
        stars: 19000,
        forks: 3000,
        watchers: 450,
        statsFetched: '2026-11-13'
      }
    };

    const result = applyBlogStats(pf, statsMap);
    expect(result.stars).toBe(99999);
    expect(result.forks).toBeUndefined();
    expect(result.watchers).toBeUndefined();
  });

  it('does not overwrite other explicit frontmatter fields when stars is unset', () => {
    const pf = {
      user: 'cilium',
      project: 'cilium',
      forks: 123,
      watchers: 45,
      statsFetched: '2026-01-01'
    };
    const statsMap = {
      'cilium/cilium': {
        stars: 19000,
        forks: 3000,
        watchers: 450,
        statsFetched: '2026-11-13'
      }
    };

    const result = applyBlogStats(pf, statsMap);
    expect(result.stars).toBe(19000);
    expect(result.forks).toBe(123);
    expect(result.watchers).toBe(45);
    expect(result.statsFetched).toBe('2026-01-01');
  });

  it('handles missing entry in statsMap cleanly', () => {
    const pf = { user: 'unknown-user', project: 'unknown-repo' };
    const statsMap = {
      'cilium/cilium': { stars: 100 }
    };

    const result = applyBlogStats(pf, statsMap);
    expect(result.stars).toBeUndefined();
    expect(result).toBe(pf);
  });

  it('handles missing or non-string user/project cleanly', () => {
    const statsMap = { 'foo/bar': { stars: 100 } };

    expect(
      applyBlogStats({ user: '', project: 'bar' }, statsMap).stars
    ).toBeUndefined();
    expect(
      applyBlogStats({ user: 'foo', project: '' }, statsMap).stars
    ).toBeUndefined();
    expect(applyBlogStats({ project: 'bar' }, statsMap).stars).toBeUndefined();
    expect(applyBlogStats({ user: 'foo' }, statsMap).stars).toBeUndefined();
    expect(
      applyBlogStats(
        { user: 123 as unknown as string, project: 'bar' },
        statsMap
      ).stars
    ).toBeUndefined();
  });
});

describe('loadBlogStats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('loads cached or file stats map', () => {
    const stats = loadBlogStats();
    expect(typeof stats).toBe('object');
    expect(stats).not.toBeNull();
    // Subsequent calls return the same cached instance
    expect(loadBlogStats()).toBe(stats);
  });

  it('reads and caches stats from blog-stats.json when present', async () => {
    vi.resetModules();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ 'cilium/cilium': { stars: 19000 } })
    );

    const { loadBlogStats: freshLoad } =
      await import('../../lib/transformPage');
    const stats = freshLoad();
    expect(stats).toEqual({ 'cilium/cilium': { stars: 19000 } });
    expect(freshLoad()).toBe(stats);
  });

  it('returns empty map when blog-stats.json is missing', async () => {
    vi.resetModules();
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const { loadBlogStats: freshLoad } =
      await import('../../lib/transformPage');
    expect(freshLoad()).toEqual({});
  });

  it('falls back to empty map on read or parse error', async () => {
    vi.resetModules();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{invalid json');

    const { loadBlogStats: freshLoad } =
      await import('../../lib/transformPage');
    expect(freshLoad()).toEqual({});
  });
});
