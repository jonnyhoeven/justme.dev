// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import transformPage from '../../lib/transformPage';

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
