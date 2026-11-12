// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { buildRssFeed, RSS_MAX_ITEMS, type RssSite } from '../../lib/rss';

const site: RssSite = {
  title: 'Justme.dev blog',
  link: 'https://justme.dev',
  description: 'Posts & notes',
  feedUrl: 'https://justme.dev/feed.xml'
};

const item = (n: number, extra = {}) => ({
  title: `Post ${n}`,
  url: `https://justme.dev/blog/p${n}`,
  date: new Date(Date.UTC(2024, 0, n)).toISOString(),
  description: `Intro ${n}`,
  ...extra
});

describe('buildRssFeed', () => {
  it('emits the RSS 2.0 envelope and channel metadata', () => {
    const xml = buildRssFeed([item(1)], site);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'
    );
    expect(xml).toContain('<title>Justme.dev blog</title>');
    expect(xml).toContain('<link>https://justme.dev</link>');
    expect(xml).toContain('<description>Posts &amp; notes</description>');
    expect(xml).toContain('<language>en</language>');
  });

  it('links to itself with atom:link rel=self', () => {
    const xml = buildRssFeed([item(1)], site);
    expect(xml).toContain(
      '<atom:link href="https://justme.dev/feed.xml" rel="self" type="application/rss+xml"/>'
    );
  });

  it('sorts items newest first and uses the newest for lastBuildDate', () => {
    const xml = buildRssFeed([item(2), item(5), item(3)], site);
    const order = [...xml.matchAll(/<title>Post (\d)<\/title>/g)].map(
      (m) => m[1]
    );
    expect(order).toEqual(['5', '3', '2']);
    expect(xml).toContain(
      '<lastBuildDate>Fri, 05 Jan 2024 00:00:00 GMT</lastBuildDate>'
    );
  });

  it('formats pubDate as RFC 822 and accepts date-only strings and Dates', () => {
    const xml = buildRssFeed(
      [
        item(1, { date: '2024-11-20' }),
        item(2, { date: new Date('2024-03-04T00:00:00Z') })
      ],
      site
    );
    expect(xml).toContain('<pubDate>Wed, 20 Nov 2024 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<pubDate>Mon, 04 Mar 2024 00:00:00 GMT</pubDate>');
  });

  it('limits the feed to the newest 20 items', () => {
    const items = Array.from({ length: 25 }, (_, i) => item(i + 1));
    const xml = buildRssFeed(items, site);
    expect(xml.match(/<item>/g)).toHaveLength(RSS_MAX_ITEMS);
    expect(xml).toContain('<title>Post 25</title>');
    expect(xml).toContain('<title>Post 6</title>');
    expect(xml).not.toContain('<title>Post 5</title>');
  });

  it('escapes & < > " and \' in titles, descriptions and URLs', () => {
    const xml = buildRssFeed(
      [
        item(1, {
          title: `Tom & "Jerry" <b>'s</b>`,
          description: 'a < b & c > d',
          url: 'https://justme.dev/blog/a?x=1&y=2'
        })
      ],
      site
    );
    expect(xml).toContain(
      '<title>Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;s&lt;/b&gt;</title>'
    );
    expect(xml).toContain('<description>a &lt; b &amp; c &gt; d</description>');
    expect(xml).toContain('https://justme.dev/blog/a?x=1&amp;y=2');
    expect(xml).not.toContain('<b>');
  });

  it('collapses whitespace in descriptions', () => {
    const xml = buildRssFeed(
      [item(1, { description: '  line one\n\n  line   two\t\n' })],
      site
    );
    expect(xml).toContain('<description>line one line two</description>');
  });

  it('marks guids as permalinks equal to the link', () => {
    const xml = buildRssFeed([item(1)], site);
    expect(xml).toContain(
      '<guid isPermaLink="true">https://justme.dev/blog/p1</guid>'
    );
  });

  it('sinks undated items and omits their pubDate', () => {
    const xml = buildRssFeed([item(1, { date: undefined }), item(2)], site);
    expect(xml.indexOf('Post 2')).toBeLessThan(xml.indexOf('Post 1'));
    expect(xml.match(/<pubDate>/g)).toHaveLength(1);
  });

  it('produces a valid empty channel without lastBuildDate', () => {
    const xml = buildRssFeed([], site);
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('<lastBuildDate>');
    expect(xml).toContain('</channel>');
    expect(xml.trimEnd().endsWith('</rss>')).toBe(true);
  });
});
