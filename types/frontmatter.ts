// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
export interface ArticleFrontmatter {
  title?: string;
  image?: string;
  /** Hide the hero image on the article page (list cards still use it). */
  hideImage?: boolean;
  intro?: string;
  model?: string;
  date?: string;
  watchersUrl?: string | null;
  starsUrl?: string | null;
  forksUrl?: string | null;
  langArr?: string[];
  languages?: string | string[];
  externalUrl?: string;
  externalUrlLabel?: string;
  gitlink?: string;
  user?: string;
  project?: string;
  [key: string]: unknown;
}

export interface ArticlePage {
  url: string;
  frontmatter: ArticleFrontmatter;
}
