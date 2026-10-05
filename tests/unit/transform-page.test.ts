import { describe, it, expect } from 'vitest';
import transformPage from '../../lib/transformPage';

describe('transformPage', () => {
  it('supplies defaults when frontmatter is empty', () => {
    const result = transformPage({
      url: '/test',
      frontmatter: {}
    });

    expect(result.frontmatter.title).toBe('Justme.dev');
    expect(result.frontmatter.intro).toBe('');
    expect(result.frontmatter.image).toBe(
      'https://media.justme.dev/images/justme.dev.webp'
    );
    expect(result.frontmatter.externalUrlLabel).toBe('View site');
    expect(result.frontmatter.watchersUrl).toBeNull();
    expect(result.frontmatter.starsUrl).toBeNull();
    expect(result.frontmatter.forksUrl).toBeNull();
    expect(result.frontmatter.langArr).toEqual([]);
    expect(result.url).toBe('/test');
  });

  it('generates GitHub badge URLs and externalUrl when gitlink is present', () => {
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
    expect(result.frontmatter.watchersUrl).toBe(
      'https://img.shields.io/github/watchers/myuser/myproject?style=flat'
    );
    expect(result.frontmatter.starsUrl).toBe(
      'https://img.shields.io/github/stars/myuser/myproject?style=flat'
    );
    expect(result.frontmatter.forksUrl).toBe(
      'https://img.shields.io/github/forks/myuser/myproject?style=flat'
    );
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
  });
});
