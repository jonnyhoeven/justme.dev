// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Color utility functions for splat animations.
 */

let darkTheme = true;

/** Set by HeroSplat each frame from the page's colour scheme. */
export function setDarkTheme(dark: boolean): void {
  darkTheme = dark;
}

export function isDarkTheme(): boolean {
  return darkTheme;
}
