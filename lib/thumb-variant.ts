// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

import { SITE_CONSTANTS } from '../.vitepress/constants';

const IMAGES_PREFIX = `${SITE_CONSTANTS.MEDIA_URL}/images/`;

/**
 * URL of the 266px-wide variant (`name-266w.webp`) of a media-host `.webp`
 * article image, or null when no variant applies (other host/format, already a
 * variant, or SITE_CONSTANTS.IMAGES.THUMB_VARIANTS is off).
 */
export function thumbVariantUrl(
  url: string | undefined | null,
  enabled: boolean = SITE_CONSTANTS.IMAGES.THUMB_VARIANTS
): string | null {
  if (!enabled || !url) return null;
  if (!url.startsWith(IMAGES_PREFIX) || !url.endsWith('.webp')) return null;
  if (url.endsWith('-266w.webp')) return null;
  return `${url.slice(0, -'.webp'.length)}-266w.webp`;
}
