// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import fs from 'node:fs';
import path from 'node:path';
import { SITE_CONSTANTS } from '../.vitepress/constants.ts';
import type { ArticleFrontmatter } from '../types/frontmatter';

export interface PageLike {
  frontmatter?: Record<string, unknown> | ArticleFrontmatter;
  description?: unknown;
}

export type RepoStats = Partial<
  Pick<ArticleFrontmatter, 'stars' | 'forks' | 'watchers' | 'statsFetched'>
>;
export type BlogStatsMap = Record<string, RepoStats>;

let cachedBlogStats: BlogStatsMap | null = null;

export function loadBlogStats(): BlogStatsMap {
  if (cachedBlogStats !== null) {
    return cachedBlogStats;
  }
  const statsPath = path.resolve(
    process.cwd(),
    'public/projects-cache/blog-stats.json'
  );
  try {
    if (fs.existsSync(statsPath)) {
      const content = fs.readFileSync(statsPath, 'utf-8');
      cachedBlogStats = JSON.parse(content) as BlogStatsMap;
      return cachedBlogStats;
    }
  } catch {
    // Ignore read / parse errors and fall back to empty map
  }
  cachedBlogStats = {};
  return cachedBlogStats;
}

export function applyBlogStats(
  pf: ArticleFrontmatter,
  statsMap: BlogStatsMap
): ArticleFrontmatter {
  if (
    pf.stars === undefined &&
    typeof pf.user === 'string' &&
    pf.user &&
    typeof pf.project === 'string' &&
    pf.project
  ) {
    const stats = statsMap[`${pf.user}/${pf.project}`];
    if (stats) {
      if (pf.stars === undefined && stats.stars !== undefined) {
        pf.stars = stats.stars;
      }
      if (pf.forks === undefined && stats.forks !== undefined) {
        pf.forks = stats.forks;
      }
      if (pf.watchers === undefined && stats.watchers !== undefined) {
        pf.watchers = stats.watchers;
      }
      if (pf.statsFetched === undefined && stats.statsFetched !== undefined) {
        pf.statsFetched = stats.statsFetched;
      }
    }
  }
  return pf;
}

export default function transformPage<T extends PageLike>(
  pageData: T
): T & { description: string; frontmatter: ArticleFrontmatter } {
  const pf: ArticleFrontmatter = { ...pageData.frontmatter };
  applyBlogStats(pf, loadBlogStats());
  pf.title = pf.title ? pf.title : 'Justme.dev';
  pf.intro = pf.intro ? pf.intro : '';
  const defaultImg = '/images/justme.dev.webp';
  let rawImage = (pf.image ? pf.image : defaultImg).trim();
  if (rawImage.startsWith('/images/')) {
    rawImage = `${SITE_CONSTANTS.MEDIA_URL}${rawImage}`;
  }
  pf.image = rawImage;
  pf.externalUrl = pf.externalUrl ?? (pf.gitlink ? `${pf.gitlink}` : undefined);
  pf.externalUrlLabel =
    pf.externalUrlLabel ??
    (pf.externalUrl?.includes('github.com') ? 'View on Github' : 'View site');

  const description: string =
    pf.intro ||
    (pageData.description as string) ||
    'Just me. Sharing insights, experiences, and tutorials related to software development and site reliability engineering.';
  pageData.description = description;

  if (Array.isArray(pf.languages)) {
    pf.langArr = pf.languages;
  } else if (
    typeof pf.languages === 'string' &&
    pf.languages.trim().length > 0
  ) {
    pf.langArr = pf.languages.split(',').map((s) => s.trim());
  } else {
    pf.langArr = [];
  }

  return {
    ...pageData,
    description,
    frontmatter: pf
  };
}
