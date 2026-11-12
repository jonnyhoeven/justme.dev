// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { onImageError } from '../../lib/image-utils';
import { SITE_CONSTANTS } from '../../.vitepress/constants';

describe('image-utils onImageError', () => {
  it('strips SITE_CONSTANTS.MEDIA_URL prefix in dev mode', () => {
    const img = {
      src: `${SITE_CONSTANTS.MEDIA_URL}/images/test.webp`
    };
    const event = {
      target: img
    } as unknown as Event;

    onImageError(event);
    expect(img.src).toBe('/images/test.webp');
  });

  it('leaves URLs untouched if they do not start with mediaPrefix', () => {
    const img = {
      src: 'https://example.com/images/test.webp'
    };
    const event = {
      target: img
    } as unknown as Event;

    onImageError(event);
    expect(img.src).toBe('https://example.com/images/test.webp');
  });

  it('handles null target gracefully', () => {
    const event = {
      target: null
    } as unknown as Event;

    expect(() => onImageError(event)).not.toThrow();
  });

  it('removes srcset so a failed small variant falls back to src', () => {
    const attrs: string[] = [];
    const img = {
      src: `${SITE_CONSTANTS.MEDIA_URL}/images/test.webp`,
      removeAttribute: (n: string) => attrs.push(n)
    };
    onImageError({ target: img } as unknown as Event);
    expect(attrs).toContain('srcset');
  });
});
