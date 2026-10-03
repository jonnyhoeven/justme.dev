export interface ArticleFrontmatter {
  title?: string;
  image?: string;
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
