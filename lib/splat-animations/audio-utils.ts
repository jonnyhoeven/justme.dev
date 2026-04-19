/**
 * Utilities for processing audio data within splat animations.
 *
 * Provides normalized (0.0 to 1.0) values for different frequency ranges.
 */

export interface AudioLevels {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}

/**
 * Extracts bass, mid, and treble levels from raw frequency data.
 * @param audioData Raw Uint8Array from Audio Analyser
 * @returns Object with normalized levels (0.0 - 1.0)
 */
export function getAudioLevels(audioData: Uint8Array | undefined): AudioLevels {
  if (!audioData || audioData.length === 0) {
    return { bass: 0, mid: 0, treble: 0, volume: 0 };
  }

  const length = audioData.length;
  const binSize = length / 3;

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;

  for (let i = 0; i < length; i++) {
    if (i < binSize) {
      bassSum += audioData[i];
    } else if (i < binSize * 2) {
      midSum += audioData[i];
    } else {
      trebleSum += audioData[i];
    }
  }

  const volume = (bassSum + midSum + trebleSum) / length / 255;

  return {
    bass: Math.min(1, bassSum / binSize / 255),
    mid: Math.min(1, midSum / binSize / 255),
    treble: Math.min(1, trebleSum / binSize / 255),
    volume
  };
}

/**
 * Utility for smooth peak detection.
 */
export function getPeak(value: number, threshold: number): number {
  return value > threshold ? (value - threshold) / (1 - threshold) : 0;
}
