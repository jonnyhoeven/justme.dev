// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDarkTheme,
  isDarkTheme
} from '../../lib/splat-animations/color-utils';

describe('color-utils theme state', () => {
  beforeEach(() => {
    setDarkTheme(true);
  });

  it('defaults to dark theme (true)', () => {
    expect(isDarkTheme()).toBe(true);
  });

  it('updates dark theme state to false when setDarkTheme(false) is called', () => {
    setDarkTheme(false);
    expect(isDarkTheme()).toBe(false);
  });

  it('updates dark theme state back to true when setDarkTheme(true) is called', () => {
    setDarkTheme(false);
    expect(isDarkTheme()).toBe(false);
    setDarkTheme(true);
    expect(isDarkTheme()).toBe(true);
  });
});
