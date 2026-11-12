// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

export interface RssItem {
  title: string;
  /** Absolute canonical URL of the post. */
  url: string;
  /** Frontmatter date (ISO string, `Date` or timestamp). */
  date?: string | number | Date;
  /** Plain-text summary (the frontmatter `intro`). */
  description?: string;
}

export interface RssSite {
  title: string;
  /** Absolute site URL, e.g. https://justme.dev */
  link: string;
  description: string;
  /** Absolute URL of the feed itself. */
  feedUrl: string;
  language?: string;
}

export const RSS_MAX_ITEMS = 20;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function toTime(value: RssItem['date']): number {
  if (value === undefined || value === null || value === '') return NaN;
  return new Date(value).getTime();
}

/** RFC 822 date, always in GMT. */
export function toRfc822(time: number): string {
  return new Date(time).toUTCString();
}

/** Build an RSS 2.0 document with the newest {@link RSS_MAX_ITEMS} items. */
export function buildRssFeed(items: RssItem[], site: RssSite): string {
  const sorted = items
    .map((item) => ({ item, time: toTime(item.date) }))
    .sort((a, b) => {
      // Undated items sink to the bottom.
      const at = Number.isNaN(a.time) ? -Infinity : a.time;
      const bt = Number.isNaN(b.time) ? -Infinity : b.time;
      return bt === at ? 0 : bt > at ? 1 : -1;
    })
    .slice(0, RSS_MAX_ITEMS);

  const newest = sorted.find((entry) => !Number.isNaN(entry.time));

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(normalizeText(site.title))}</title>`,
    `    <link>${escapeXml(site.link)}</link>`,
    `    <description>${escapeXml(normalizeText(site.description))}</description>`,
    `    <language>${escapeXml(site.language ?? 'en')}</language>`
  ];
  if (newest) {
    lines.push(`    <lastBuildDate>${toRfc822(newest.time)}</lastBuildDate>`);
  }
  lines.push(
    `    <atom:link href="${escapeXml(site.feedUrl)}" rel="self" type="application/rss+xml"/>`
  );

  for (const { item, time } of sorted) {
    lines.push('    <item>');
    lines.push(`      <title>${escapeXml(normalizeText(item.title))}</title>`);
    lines.push(`      <link>${escapeXml(item.url)}</link>`);
    lines.push(`      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`);
    if (!Number.isNaN(time)) {
      lines.push(`      <pubDate>${toRfc822(time)}</pubDate>`);
    }
    lines.push(
      `      <description>${escapeXml(normalizeText(item.description))}</description>`
    );
    lines.push('    </item>');
  }

  lines.push('  </channel>', '</rss>', '');
  return lines.join('\n');
}
