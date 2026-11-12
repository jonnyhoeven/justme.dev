// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { thumbVariantUrl } from '../../lib/thumb-variant';
import { SITE_CONSTANTS } from '../../.vitepress/constants';

const base = `${SITE_CONSTANTS.MEDIA_URL}/images`;

describe('thumbVariantUrl', () => {
  it('derives the -266w variant for media-host webp images', () => {
    expect(thumbVariantUrl(`${base}/argocd.webp`, true)).toBe(
      `${base}/argocd-266w.webp`
    );
  });

  it('returns null for other hosts, formats, variants and empty input', () => {
    expect(
      thumbVariantUrl('https://example.com/images/a.webp', true)
    ).toBeNull();
    expect(thumbVariantUrl(`${base}/a.png`, true)).toBeNull();
    expect(thumbVariantUrl(`${base}/a-266w.webp`, true)).toBeNull();
    expect(thumbVariantUrl('/images/a.webp', true)).toBeNull();
    expect(thumbVariantUrl(undefined, true)).toBeNull();
  });

  it('returns null when disabled', () => {
    expect(thumbVariantUrl(`${base}/a.webp`, false)).toBeNull();
  });

  it('is disabled by default until the variants are synced', () => {
    expect(SITE_CONSTANTS.IMAGES.THUMB_VARIANTS).toBe(false);
    expect(thumbVariantUrl(`${base}/a.webp`)).toBeNull();
  });
});
