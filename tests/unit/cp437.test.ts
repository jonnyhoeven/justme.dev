// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { decodeCp437Byte } from '../../lib/audio/cp437';

describe('cp437 decoder', () => {
  it('decodes ASCII printable characters unchanged', () => {
    expect(decodeCp437Byte(0x41)).toBe('A');
    expect(decodeCp437Byte(0x7e)).toBe('~');
    expect(decodeCp437Byte(0x20)).toBe(' ');
  });

  it('converts control codes below 0x20 to space', () => {
    expect(decodeCp437Byte(0x00)).toBe(' ');
    expect(decodeCp437Byte(0x0a)).toBe(' ');
    expect(decodeCp437Byte(0x1f)).toBe(' ');
  });

  it('decodes high bytes 0x80-0xFF using CP437 table', () => {
    expect(decodeCp437Byte(0x80)).toBe('Ç');
    expect(decodeCp437Byte(0x81)).toBe('ü');
    expect(decodeCp437Byte(0xff)).toBe(' ');
  });
});
