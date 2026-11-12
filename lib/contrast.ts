// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later

/** WCAG 2.x contrast helpers (pure; used by tests/unit/contrast.test.ts). */

export interface RGBA {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-1
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [f(hue + 1 / 3) * 255, f(hue) * 255, f(hue - 1 / 3) * 255];
}

function parseChannel(v: string, scale: number): number {
  const t = v.trim();
  return t.endsWith('%') ? (parseFloat(t) / 100) * scale : parseFloat(t);
}

/**
 * Parses #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() and hsl()/hsla() colours.
 * Returns null for anything else (color-mix, var(), keywords, ...).
 */
export function parseColor(input: string): RGBA | null {
  const v = input.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }

  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const alpha = parts[3] === undefined ? 1 : parseChannel(parts[3], 1);
  if (Number.isNaN(alpha)) return null;
  const a = clamp(alpha, 0, 1);

  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((p) => parseChannel(p, 255));
    if ([r, g, b].some(Number.isNaN)) return null;
    return {
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
      a
    };
  }

  const h = parseFloat(parts[0]);
  const s = parseChannel(parts[1], 1);
  const l = parseChannel(parts[2], 1);
  if ([h, s, l].some(Number.isNaN)) return null;
  const [r, g, b] = hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1));
  return { r, g, b, a };
}

/** Composites `fg` over an opaque `bg` (straight alpha). */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1
  };
}

/** WCAG 2.x relative luminance of an opaque colour. */
export function relativeLuminance(c: RGBA): number {
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/**
 * WCAG contrast ratio (1-21). A translucent `fg` is composited over `bg`;
 * a translucent `bg` is composited over `base` (default white).
 */
export function contrastRatio(
  fg: RGBA,
  bg: RGBA,
  base: RGBA = { r: 255, g: 255, b: 255, a: 1 }
): number {
  const opaqueBg = bg.a < 1 ? composite(bg, base) : bg;
  const opaqueFg = fg.a < 1 ? composite(fg, opaqueBg) : fg;
  const l1 = relativeLuminance(opaqueFg);
  const l2 = relativeLuminance(opaqueBg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
