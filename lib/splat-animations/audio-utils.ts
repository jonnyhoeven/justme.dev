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
 * Levels plus rhythm information, produced by `AudioTracker`.
 * Every value is already smoothed, so animations can use it directly.
 */
export interface AudioFeel extends AudioLevels {
  /** Beat envelope: jumps to 0.5-1 on a detected kick, decays in ~200ms */
  beat: number;
  /** Total beats detected so far; compare with a stored value to catch a beat */
  beats: number;
}

/** Cached zero-levels object — use when audio is inactive to avoid allocations. */
export const ZERO_AUDIO_LEVELS: AudioFeel = Object.freeze({
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  beat: 0,
  beats: 0
});

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

/**
 * Exponential Moving Average (EMA) smoothing function.
 * @param current The current smoothed value
 * @param target The new target value to smooth towards
 * @param factor Smoothing factor (0.0 to 1.0). Lower is smoother.
 */
export function smoothValue(
  current: number,
  target: number,
  factor = 0.02
): number {
  return current * (1 - factor) + target * factor;
}

// Band edges as fractions of the spectrum. With a 1024-point FFT at 44.1kHz
// that is roughly 0-250Hz (kick/bass), 250Hz-2.2kHz (body) and 2.2-9kHz (air).
const BASS_END = 0.012;
const MID_END = 0.1;
const TREBLE_END = 0.4;
const ATTACK_MS = 25;
const RELEASE_MS = 170;
const BEAT_DECAY_MS = 200;
const BEAT_COOLDOWN_MS = 120;
const BEAT_MIN_LEVEL = 0.22;
const BEAT_MIN_ONSET = 0.1;
// Re-arm once bass has dipped this far below its peak since the last beat, so a
// rolling bassline (which never returns to its average) still fires every hit
const BEAT_REARM_DIP = 0.07;
const BASS_AVG_MS = 250;
// Auto-gain: the reference peak falls this much per ms, but never below the floor
const GAIN_RELEASE = 0.00005;
const GAIN_FLOOR = 0.2;

const bandMean = (data: Uint8Array, from: number, to: number) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += data[i];
  return sum / (to - from) / 255;
};

/**
 * Turns raw FFT bytes into musically useful signals: three bands that are
 * auto-gained and given a fast attack / slow release, plus kick detection.
 * Create one per component and call `update` once per frame; the returned
 * object is reused between calls.
 */
export class AudioTracker {
  private out: AudioFeel = {
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
    beat: 0,
    beats: 0
  };
  private peak = [GAIN_FLOOR, GAIN_FLOOR, GAIN_FLOOR];
  private bassAvg = 0;
  private lastBass = 0;
  private sinceBeat = Infinity;
  private armed = true;
  private peakSinceBeat = 0;
  private primed = false;

  update(data: Uint8Array | undefined, dtMs: number): AudioFeel {
    const dt = Math.min(100, Math.max(1, dtMs));
    const o = this.out;
    const raw = [0, 0, 0];

    if (data && data.length > 0) {
      const n = data.length;
      const e1 = Math.max(1, Math.round(n * BASS_END));
      const e2 = Math.min(n, Math.max(e1 + 1, Math.round(n * MID_END)));
      const e3 = Math.min(n, Math.max(e2 + 1, Math.round(n * TREBLE_END)));
      raw[0] = bandMean(data, 0, e1);
      raw[1] = bandMean(data, e1, e2);
      raw[2] = bandMean(data, Math.min(e2, e3 - 1), e3);
    }

    const norm = [0, 0, 0];
    for (let b = 0; b < 3; b++) {
      this.peak[b] = Math.max(
        GAIN_FLOOR,
        raw[b],
        this.peak[b] - dt * GAIN_RELEASE
      );
      norm[b] = Math.min(1, raw[b] / this.peak[b]);
    }

    const attack = 1 - Math.exp(-dt / ATTACK_MS);
    const release = 1 - Math.exp(-dt / RELEASE_MS);
    const follow = (cur: number, target: number) =>
      cur + (target - cur) * (target > cur ? attack : release);
    o.bass = follow(o.bass, norm[0]);
    o.mid = follow(o.mid, norm[1]);
    o.treble = follow(o.treble, norm[2]);
    o.volume = (o.bass + o.mid + o.treble) / 3;

    // Kick: bass that jumps well above its recent average while still rising
    this.sinceBeat += dt;
    // (after a beat it re-arms only once bass has dipped, so a held note is one
    // beat, not a stream of them)
    if (!this.primed) {
      this.bassAvg = norm[0]; // don't read the first frame as a kick
      this.primed = true;
    }
    const onset = norm[0] - this.bassAvg;
    this.peakSinceBeat = Math.max(this.peakSinceBeat, norm[0]);
    if (norm[0] < this.peakSinceBeat - BEAT_REARM_DIP) this.armed = true;
    if (
      this.armed &&
      onset > BEAT_MIN_ONSET &&
      norm[0] > BEAT_MIN_LEVEL &&
      norm[0] >= this.lastBass &&
      this.sinceBeat > BEAT_COOLDOWN_MS
    ) {
      this.sinceBeat = 0;
      this.armed = false;
      this.peakSinceBeat = norm[0];
      o.beats++;
      o.beat = Math.min(1, 0.55 + onset * 1.5);
    } else {
      o.beat *= Math.exp(-dt / BEAT_DECAY_MS);
    }
    this.bassAvg +=
      (norm[0] - this.bassAvg) * (1 - Math.exp(-dt / BASS_AVG_MS));
    this.lastBass = norm[0];
    return o;
  }
}
