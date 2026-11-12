// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

import { SITE_CONSTANTS } from '../.vitepress/constants';

export function onImageError(event: Event): void {
  const target0 = event.target as HTMLImageElement | null;
  // A failed small srcset candidate must not stick: drop srcset so src (full size) is used.
  if (target0 && typeof target0.removeAttribute === 'function') {
    target0.removeAttribute('srcset');
  }
  // Only fallback to local images in development mode
  if (!import.meta.env.DEV) return;
  const target = event.target as HTMLImageElement | null;
  if (!target) return;
  const mediaPrefix = SITE_CONSTANTS.MEDIA_URL;
  if (target.src.startsWith(mediaPrefix)) {
    target.src = target.src.slice(mediaPrefix.length);
  }
}
