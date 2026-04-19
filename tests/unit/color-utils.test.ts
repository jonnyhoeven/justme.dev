import { describe, it, expect } from 'vitest';
import { lerpToWhite } from '../../lib/splat-animations/color-utils';

describe('lerpToWhite', () => {
  it('returns the original color (5-bit aligned) when t=0', () => {
    // r=100 & 0xf8 = 96, g=150 & 0xf8 = 144, b=200 & 0xf8 = 200
    expect(lerpToWhite(100, 150, 200, 0)).toBe('96, 144, 200');
  });

  it('returns white (248, 248, 248) when t=1', () => {
    // 255 & 0xf8 = 248
    expect(lerpToWhite(0, 0, 0, 1)).toBe('248, 248, 248');
  });

  it('returns white components when starting from white at t=1', () => {
    // 255 & 0xf8 = 248
    expect(lerpToWhite(255, 255, 255, 1)).toBe('248, 248, 248');
  });

  it('interpolates midpoint correctly at t=0.5', () => {
    // r: floor(0 + 255*0.5) & 0xf8 = floor(127.5) & 0xf8 = 127 & 0xf8 = 120
    // g: same → 120
    // b: same → 120
    expect(lerpToWhite(0, 0, 0, 0.5)).toBe('120, 120, 120');
  });

  it('clamps t below 0 to 0', () => {
    const atZero = lerpToWhite(100, 100, 100, 0);
    const belowZero = lerpToWhite(100, 100, 100, -1);
    expect(belowZero).toBe(atZero);
  });

  it('clamps t above 1 to 1', () => {
    const atOne = lerpToWhite(100, 100, 100, 1);
    const aboveOne = lerpToWhite(100, 100, 100, 2);
    expect(aboveOne).toBe(atOne);
  });

  it('returns a string in the format "r, g, b"', () => {
    const result = lerpToWhite(128, 64, 32, 0.25);
    expect(result).toMatch(/^\d+, \d+, \d+$/);
  });

  it('applies 5-bit alignment (& 0xf8) to each channel', () => {
    // All output values should be divisible by 8
    const result = lerpToWhite(33, 77, 199, 0.3);
    const [r, g, b] = result.split(', ').map(Number);
    expect(r % 8).toBe(0);
    expect(g % 8).toBe(0);
    expect(b % 8).toBe(0);
  });

  it('handles each channel independently', () => {
    const r0 = lerpToWhite(0, 128, 255, 0);
    // r: 0 & 0xf8 = 0, g: 128 & 0xf8 = 128, b: 255 & 0xf8 = 248
    expect(r0).toBe('0, 128, 248');
  });
});
