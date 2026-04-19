import { describe, it, expect } from 'vitest';
import {
  VOLUME_SMOOTHING,
  SIZE_OSCILLATION_AMP,
  CENTER_X,
  CENTER_Y,
  DEFAULT_CENTER_X,
  DEFAULT_CENTER_Y,
  CANVAS_WIDTH
} from '../../lib/splat-animations/animation-constants';

describe('animation-constants', () => {
  it('VOLUME_SMOOTHING is a number between 0 and 1', () => {
    expect(typeof VOLUME_SMOOTHING).toBe('number');
    expect(VOLUME_SMOOTHING).toBeGreaterThan(0);
    expect(VOLUME_SMOOTHING).toBeLessThanOrEqual(1);
  });

  it('SIZE_OSCILLATION_AMP is a positive number', () => {
    expect(typeof SIZE_OSCILLATION_AMP).toBe('number');
    expect(SIZE_OSCILLATION_AMP).toBeGreaterThan(0);
  });

  it('CENTER_X and CENTER_Y match canvas center', () => {
    // Canvas is 320 wide; center should be 160
    expect(CENTER_X).toBe(CANVAS_WIDTH / 2);
    expect(CENTER_Y).toBe(160);
  });

  it('DEFAULT_CENTER_X equals CENTER_X', () => {
    expect(DEFAULT_CENTER_X).toBe(CENTER_X);
  });

  it('DEFAULT_CENTER_Y equals CENTER_Y', () => {
    expect(DEFAULT_CENTER_Y).toBe(CENTER_Y);
  });

  it('CANVAS_WIDTH is a positive integer', () => {
    expect(CANVAS_WIDTH).toBeGreaterThan(0);
    expect(Number.isInteger(CANVAS_WIDTH)).toBe(true);
  });
});
