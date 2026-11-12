// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  buildStructuredData,
  serializeJsonLd
} from '../../lib/structured-data';

const pageUrl = 'https://justme.dev/blog/post';

describe('buildStructuredData', () => {
  it('builds a full BlogPosting', () => {
    const data = buildStructuredData({
      relativePath: 'blog/post.md',
      frontmatter: {
        type: 'blog',
        title: 'Hello',
        date: '2024-11-20',
        languages: 'Go, Python'
      },
      lastUpdated: Date.UTC(2025, 0, 2),
      pageUrl,
      image: 'https://media.justme.dev/images/a.webp',
      description: 'An intro'
    });
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Hello',
      description: 'An intro',
      image: 'https://media.justme.dev/images/a.webp',
      datePublished: '2024-11-20T00:00:00.000Z',
      dateModified: '2025-01-02T00:00:00.000Z',
      author: {
        '@type': 'Person',
        name: 'Jonny van der Hoeven',
        url: 'https://justme.dev/'
      },
      publisher: {
        '@type': 'Person',
        name: 'Jonny van der Hoeven',
        url: 'https://justme.dev/'
      },
      mainEntityOfPage: pageUrl,
      url: pageUrl,
      keywords: ['Go', 'Python']
    });
  });

  it('omits missing fields and falls back modified to published', () => {
    const data = buildStructuredData({
      relativePath: 'blog/post.md',
      frontmatter: { type: 'blog', title: 'Hi', date: '2024-01-01' },
      pageUrl
    })!;
    expect(data.dateModified).toBe(data.datePublished);
    expect(data).not.toHaveProperty('image');
    expect(data).not.toHaveProperty('description');
    expect(data).not.toHaveProperty('keywords');
    expect(JSON.stringify(data)).not.toMatch(/undefined|null/);
  });

  it('accepts array languages and ignores invalid lastUpdated', () => {
    const data = buildStructuredData({
      relativePath: 'blog/post.md',
      frontmatter: { type: 'blog', title: 'Hi', languages: ['Go', ' '] },
      lastUpdated: 0,
      pageUrl
    })!;
    expect(data.keywords).toEqual(['Go']);
    expect(data).not.toHaveProperty('dateModified');
    expect(data).not.toHaveProperty('datePublished');
  });

  it('builds the home graph with WebSite and Person', () => {
    const data = buildStructuredData({
      relativePath: 'index.md',
      frontmatter: { layout: 'home' },
      pageUrl: 'https://justme.dev/'
    })!;
    const graph = data['@graph'] as Record<string, unknown>[];
    expect(data['@context']).toBe('https://schema.org');
    expect(graph.map((n) => n['@type'])).toEqual(['WebSite', 'Person']);
    expect(graph[0]).toMatchObject({
      name: 'Justme.dev',
      url: 'https://justme.dev/'
    });
    expect(graph[1]).toMatchObject({
      name: 'Jonny van der Hoeven',
      image: 'https://media.justme.dev/images/ava.webp'
    });
    const sameAs = graph[1].sameAs as string[];
    expect(sameAs).toContain('https://github.com/jonnyhoeven/');
    expect(sameAs.some((u) => u.endsWith('justme.dev'))).toBe(false);
  });

  it('returns nothing for non-blog pages', () => {
    expect(
      buildStructuredData({
        relativePath: 'projects.md',
        frontmatter: { title: 'Projects' },
        pageUrl: 'https://justme.dev/projects'
      })
    ).toBeUndefined();
    expect(
      buildStructuredData({
        relativePath: 'projects/x.md',
        frontmatter: { type: 'project', date: '2024-01-01' },
        pageUrl
      })
    ).toBeUndefined();
    expect(
      buildStructuredData({ relativePath: 'x.md', pageUrl })
    ).toBeUndefined();
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so </script> cannot break out', () => {
    const out = serializeJsonLd({ headline: '</script><b>x' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).headline).toBe('</script><b>x');
  });
});
