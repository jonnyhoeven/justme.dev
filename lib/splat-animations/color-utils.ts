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
