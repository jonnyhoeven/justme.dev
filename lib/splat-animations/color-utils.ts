/**
 * Color utility functions for splat animations.
 */

/**
 * Linearly interpolates a color toward white (255, 255, 255).
 * includes a bitwise AND with 0xf8 to maintain 5-bit color alignment
 * used in the splat rendering system.
 *
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param t Interpolation factor (0.0 to 1.0)
 * @returns CSS color string in "r, g, b" format
 */
export function lerpToWhite(
  r: number,
  g: number,
  b: number,
  t: number
): string {
  const clampT = Math.max(0, Math.min(1, t));
  const nr = Math.floor(r + (255 - r) * clampT) & 0xf8;
  const ng = Math.floor(g + (255 - g) * clampT) & 0xf8;
  const nb = Math.floor(b + (255 - b) * clampT) & 0xf8;
  return `${nr}, ${ng}, ${nb}`;
}

/** Near-black: on a white page a "flash" is a darkening, which keeps the dot's own hue. */
const LIGHT_THEME_HIGHLIGHT = [28, 26, 38];
/** Cap so even a full flash stays a shade of the original colour */
const LIGHT_THEME_MAX_MIX = 0.7;

let darkTheme = true;

/** Set by HeroSplat each frame from the page's colour scheme. */
export function setDarkTheme(dark: boolean): void {
  darkTheme = dark;
}

export function isDarkTheme(): boolean {
  return darkTheme;
}

/**
 * Brightens a colour towards white on the dark theme; on the light theme it
 * darkens towards near-black instead, since white highlights wash out there.
 */
export function lerpToHighlight(
  r: number,
  g: number,
  b: number,
  t: number
): string {
  if (darkTheme) return lerpToWhite(r, g, b, t);
  const k = Math.max(0, Math.min(1, t)) * LIGHT_THEME_MAX_MIX;
  const [hr, hg, hb] = LIGHT_THEME_HIGHLIGHT;
  const mix = (from: number, to: number) =>
    Math.floor(from + (to - from) * k) & 0xf8;
  return `${mix(r, hr)}, ${mix(g, hg)}, ${mix(b, hb)}`;
}
