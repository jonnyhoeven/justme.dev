// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, parseColor, type RGBA } from '../../lib/contrast';

/**
 * Backs the "WCAG AA compliant" claims in .vitepress/theme/tokens.css:
 * parses the token file and asserts a curated list of foreground/background
 * pairs in light and dark mode.
 */

const css = readFileSync(
  resolve(__dirname, '../../.vitepress/theme/tokens.css'),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');

function extractVars(selectorRe: string): Record<string, string> {
  // Anchored at line start so indented :root blocks inside @media are skipped.
  const m = new RegExp(`^${selectorRe}\\s*\\{([^}]*)\\}`, 'm').exec(css);
  const vars: Record<string, string> = {};
  if (!m) return vars;
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[d[1]] = d[2].replace(/\s+/g, ' ').trim();
  }
  return vars;
}

/**
 * VitePress defaults that tokens.css does not override (vars.css in
 * vitepress/dist/client/theme-default/styles). Hardcoded here on purpose.
 */
const VITEPRESS_DEFAULTS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--vp-c-white': '#ffffff',
    '--vp-c-text-1': '#3c3c43',
    '--vp-c-text-2': '#67676c'
  },
  dark: {
    '--vp-c-white': '#ffffff'
  }
};

const rootVars = extractVars(':root');
const darkVars = extractVars('\\.dark');

const themes = {
  light: { ...VITEPRESS_DEFAULTS.light, ...rootVars },
  dark: { ...VITEPRESS_DEFAULTS.dark, ...rootVars, ...darkVars }
} as const;

/** Resolves a token to a colour; null if unresolvable (e.g. color-mix). */
function resolveToken(
  vars: Record<string, string>,
  name: string,
  depth = 0
): RGBA | null {
  if (depth > 10) return null;
  const value = vars[name];
  if (value === undefined) return null;
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value);
  if (ref) {
    if (vars[ref[1]] !== undefined) {
      return resolveToken(vars, ref[1], depth + 1);
    }
    return ref[2] ? parseColor(ref[2]) : null;
  }
  return parseColor(value);
}

interface Pair {
  label: string;
  fg: string;
  bg: string;
  /** Minimum ratio: 4.5 for normal text (3 would apply to large text / UI). */
  min: number;
  /** Known failure to be decided by the owner; asserted with it.fails. */
  knownFailure?: Partial<Record<'light' | 'dark', string>>;
}

const AA = 4.5;
const backgrounds = [
  '--vp-c-bg',
  '--vp-c-bg-alt',
  '--vp-c-bg-soft',
  '--vp-c-bg-elv'
];

const pairs: Pair[] = [
  ...['--vp-c-text-1', '--vp-c-text-2'].flatMap((fg) =>
    backgrounds.map((bg) => ({
      label: `${fg} on ${bg}`,
      fg,
      bg,
      min: AA
    }))
  ),
  // Brand colour used as link text.
  ...backgrounds.map((bg) => ({
    label: `--vp-c-brand-1 (link) on ${bg}`,
    fg: '--vp-c-brand-1',
    bg,
    min: AA
  })),
  // Brand button states.
  ...['', 'hover-', 'active-'].map((state) => ({
    label: `button brand ${state || 'normal '}text on bg`,
    fg: `--vp-button-brand-${state}text`,
    bg: `--vp-button-brand-${state}bg`,
    min: AA
  })),
  // Footer text (VitePress: .message/.copyright use --vp-c-text-2) on the
  // footer background (--vp-c-bg).
  {
    label: 'footer text (--vp-c-text-2) on footer bg (--vp-c-bg)',
    fg: '--vp-c-text-2',
    bg: '--vp-c-bg',
    min: AA
  }
];

describe('tokens.css contrast (WCAG AA)', () => {
  it('parses the token blocks', () => {
    expect(rootVars['--vp-c-bg']).toBeDefined();
    expect(darkVars['--vp-c-bg']).toBeDefined();
  });

  for (const mode of ['light', 'dark'] as const) {
    describe(mode, () => {
      for (const p of pairs) {
        const known = p.knownFailure?.[mode];
        const run = known ? it.fails : it;
        run(
          `${p.label} >= ${p.min}:1${known ? ` (KNOWN: ${known})` : ''}`,
          () => {
            const fg = resolveToken(themes[mode], p.fg);
            const bg = resolveToken(themes[mode], p.bg);
            // Unresolvable values (color-mix etc.) are skipped, not failed.
            if (!fg || !bg) return;
            const ratio = contrastRatio(fg, bg);
            expect(ratio).toBeGreaterThanOrEqual(p.min);
          }
        );
      }
    });
  }
});
