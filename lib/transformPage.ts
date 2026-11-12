// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { SITE_CONSTANTS } from '../.vitepress/constants';
import type { ArticleFrontmatter } from '../types/frontmatter';

export interface PageLike {
  frontmatter?: Record<string, unknown> | ArticleFrontmatter;
  description?: unknown;
}

export default function transformPage<T extends PageLike>(
  pageData: T
): T & { description: string; frontmatter: ArticleFrontmatter } {
  const pf: ArticleFrontmatter = { ...pageData.frontmatter };
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
    pf.externalUrlLabel ?? (pf.gitlink ? 'View on Github' : 'View site');

  const description: string =
    pf.intro ||
    (pageData.description as string) ||
    'Just me. Sharing insights, experiences, and tutorials related to software development and site reliability engineering.';
  pageData.description = description;

  const badgeHost = 'https://img.shields.io/github';
  const hasGithubRepo = Boolean(pf.user && pf.project);
  pf.watchersUrl = hasGithubRepo
    ? `${badgeHost}/watchers/${pf.user}/${pf.project}?style=flat`
    : null;
  pf.starsUrl = hasGithubRepo
    ? `${badgeHost}/stars/${pf.user}/${pf.project}?style=flat`
    : null;
  pf.forksUrl = hasGithubRepo
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
    description,
    frontmatter: pf
  };
}
