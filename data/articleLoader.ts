import { createContentLoader } from 'vitepress';
import transformPage from '../lib/transformPage';
import type { ArticlePage } from '../types/frontmatter';

export function createArticleLoader(pattern: string) {
  return createContentLoader<ArticlePage[]>(pattern, {
    includeSrc: false,
    render: false,
    excerpt: false,
    transform(data) {
      return data
        .sort(
          (a, b) =>
            +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date)
        )
        .map((page) => transformPage(page));
    }
  });
}
