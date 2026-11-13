// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { SITE_CONSTANTS } from '../.vitepress/constants.ts';

export interface StructuredDataInput {
  /** Path relative to the source root, e.g. `index.md` or `blog/argocd.md`. */
  relativePath: string;
  frontmatter?: Record<string, unknown>;
  /** Git last-updated timestamp (ms since epoch), if known. */
  lastUpdated?: number;
  /** Absolute canonical URL of the page. */
  pageUrl: string;
  /** Absolute image URL (already resolved by the caller). */
  image?: string;
  /** Resolved page description. */
  description?: string;
}

type JsonLd = Record<string, unknown>;

const SCHEMA_CONTEXT = 'https://schema.org';

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  const s = str(value);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

/** Drops keys whose value is undefined, null or an empty string/array. */
function compact<T extends JsonLd>(obj: T): JsonLd {
  const out: JsonLd = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

function person(): JsonLd {
  return {
    '@type': 'Person',
    name: SITE_CONSTANTS.AUTHOR,
    url: `${SITE_CONSTANTS.HOSTNAME}/`
  };
}

function keywords(languages: unknown): string[] {
  const list = Array.isArray(languages)
    ? languages
    : typeof languages === 'string'
      ? languages.split(',')
      : [];
  return list.map((s) => str(s)).filter((s): s is string => Boolean(s));
}

/**
 * Builds the schema.org JSON-LD object for a page, or `undefined` when the
 * page gets none (only blog posts and the home page do).
 */
export function buildStructuredData(
  input: StructuredDataInput
): JsonLd | undefined {
  const pf = input.frontmatter ?? {};

  if (input.relativePath === 'index.md') {
    const sameAs = Object.entries(SITE_CONSTANTS.SOCIAL_LINKS)
      .filter(([key]) => key !== 'REPO')
      .map(([, url]) => url);
    return {
      '@context': SCHEMA_CONTEXT,
      '@graph': [
        compact({
          '@type': 'WebSite',
          '@id': `${SITE_CONSTANTS.HOSTNAME}/#website`,
          name: SITE_CONSTANTS.SITE_NAME,
          url: `${SITE_CONSTANTS.HOSTNAME}/`,
          description: SITE_CONSTANTS.DESCRIPTION,
          inLanguage: SITE_CONSTANTS.LANG
        }),
        compact({
          ...person(),
          '@id': `${SITE_CONSTANTS.HOSTNAME}/#person`,
          image: SITE_CONSTANTS.IMAGES.AVATAR,
          sameAs
        })
      ]
    };
  }

  if (pf.type !== 'blog') return undefined;

  const published = toIso(pf.date);
  const modified =
    typeof input.lastUpdated === 'number' && input.lastUpdated > 0
      ? new Date(input.lastUpdated).toISOString()
      : published;
  const title = str(pf.title);

  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'BlogPosting',
    headline: title,
    description: str(input.description)?.replace(/\s+/g, ' '),
    image: str(input.image),
    datePublished: published,
    dateModified: modified,
    author: person(),
    publisher: person(),
    mainEntityOfPage: input.pageUrl,
    url: input.pageUrl,
    keywords: keywords(pf.languages)
  });
}

/** Serialises JSON-LD for inline `<script>` use; `<` is escaped so `</script>` cannot break out. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
