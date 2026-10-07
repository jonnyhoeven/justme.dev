// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import type { ArticleFrontmatter } from '../types/frontmatter';

export interface PageLike {
  frontmatter?: Record<string, unknown> | ArticleFrontmatter;
  [key: string]: unknown;
}

export default function transformPage<T extends PageLike>(
  pageData: T
): T & { frontmatter: ArticleFrontmatter } {
  const pf: ArticleFrontmatter = { ...pageData.frontmatter };
  pf.title = pf.title ? pf.title : 'Justme.dev';
  pf.intro = pf.intro ? pf.intro : '';
  const defaultImg = '/images/justme.dev.webp';
  let rawImage = (pf.image ? pf.image : defaultImg).trim();
  if (rawImage.startsWith('/images/')) {
    rawImage = `https://media.justme.dev${rawImage}`;
  }
  pf.image = rawImage;
  pf.externalUrl = pf.gitlink ? `${pf.gitlink}` : pf.externalUrl;
  pf.externalUrlLabel = pf.gitlink ? 'View on Github' : 'View site';

  const badgeHost = 'https://img.shields.io/github';
  pf.watchersUrl = pf.gitlink
    ? `${badgeHost}/watchers/${pf.user}/${pf.project}?style=flat`
    : null;
  pf.starsUrl = pf.gitlink
    ? `${badgeHost}/stars/${pf.user}/${pf.project}?style=flat`
    : null;
  pf.forksUrl = pf.gitlink
    ? `${badgeHost}/forks/${pf.user}/${pf.project}?style=flat`
    : null;
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
    frontmatter: pf
  };
}
