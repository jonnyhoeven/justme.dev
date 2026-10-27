// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeAll } from 'vitest';
import { XMPlayer } from '../../lib/audio/xm-player';

export function buildSampleXMBuffer(): ArrayBuffer {
  const totalSize = 1235;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  function writeAscii(offset: number, str: string, len: number): void {
    for (let i = 0; i < len; i++) {
      bytes[offset + i] = i < str.length ? str.charCodeAt(i) : 0x20;
    }
  }

  // Preamble (60 bytes)
  writeAscii(0, 'Extended Module: ', 17);
  writeAscii(17, 'Purple Motions', 20);
  bytes[37] = 0x1a;
  writeAscii(38, 'FastTracker v2.00', 20);
  view.setUint16(58, 0x0104, true);

  // XM Header
  view.setUint32(0x3c, 276, true); // Header size after 0x3c
  view.setUint16(0x40, 2, true); // songlen
  view.setUint16(0x42, 0, true); // song_looppos
  view.setUint16(0x44, 4, true); // nchan
  view.setUint16(0x46, 2, true); // npat
  view.setUint16(0x48, 1, true); // ninst
  view.setUint16(0x4a, 1, true); // flags (linear freq)
  view.setUint16(0x4c, 6, true); // tempo
  view.setUint16(0x4e, 125, true); // bpm
  bytes[0x50] = 0; // pattern 0
  bytes[0x51] = 1; // pattern 1

  // Pattern 0 at 336 (0x3c + 276)
  let idx = 336;
  view.setUint32(idx, 9, true); // patheaderlen
  bytes[idx + 4] = 0; // patpacking
  view.setUint16(idx + 5, 64, true); // patrows
  view.setUint16(idx + 7, 258, true); // patsize
  idx += 9;

  // Row 0: Ch 0 has note+inst, ch 1-3 empty
  bytes[idx++] = 0x83; // byte0: packed note + inst
  bytes[idx++] = 49; // note: C-4 (48 + 1)
  bytes[idx++] = 1; // inst: 1
  bytes[idx++] = 0x80; // ch 1 empty
  bytes[idx++] = 0x80; // ch 2 empty
  bytes[idx++] = 0x80; // ch 3 empty

  // Rows 1..63: 63 * 4 = 252 empty cells
  for (let r = 1; r < 64; r++) {
    for (let c = 0; c < 4; c++) {
      bytes[idx++] = 0x80;
    }
  }

  // Pattern 1 at idx
  view.setUint32(idx, 9, true); // patheaderlen
  bytes[idx + 4] = 0; // patpacking
  view.setUint16(idx + 5, 64, true); // patrows
  view.setUint16(idx + 7, 256, true); // patsize
  idx += 9;

  // Rows 0..63: 64 * 4 = 256 empty cells
  for (let r = 0; r < 64; r++) {
    for (let c = 0; c < 4; c++) {
      bytes[idx++] = 0x80;
    }
  }

  // Instrument 0 at idx
  const instIdx = idx;
  view.setUint32(instIdx, 263, true); // hdrsiz
  writeAscii(instIdx + 4, 'Lead Synth', 22);
  view.setUint16(instIdx + 0x1b, 1, true); // nsamp
  view.setUint32(instIdx + 0x1d, 40, true); // samphdrsiz

  // Volume envelope: 2 points
  view.setUint16(instIdx + 129, 0, true); // pt 0 x
  view.setUint16(instIdx + 131, 64, true); // pt 0 y
  view.setUint16(instIdx + 133, 10, true); // pt 1 x
  view.setUint16(instIdx + 135, 64, true); // pt 1 y

  // Pan envelope: 2 points
  view.setUint16(instIdx + 177, 0, true); // pt 0 x
  view.setUint16(instIdx + 179, 32, true); // pt 0 y
  view.setUint16(instIdx + 181, 10, true); // pt 1 x
  view.setUint16(instIdx + 183, 32, true); // pt 1 y

  bytes[instIdx + 225] = 2; // env_nvol
  bytes[instIdx + 226] = 2; // env_npan
  bytes[instIdx + 227] = 1; // env_vol_sustain
  bytes[instIdx + 228] = 0; // env_vol_loop_start
  bytes[instIdx + 229] = 1; // env_vol_loop_end
  bytes[instIdx + 230] = 1; // env_pan_sustain
  bytes[instIdx + 231] = 0; // env_pan_loop_start
  bytes[instIdx + 232] = 1; // env_pan_loop_end
  bytes[instIdx + 233] = 1; // env_vol_type
  bytes[instIdx + 234] = 0; // env_pan_type
  view.setUint16(instIdx + 239, 0, true); // vol_fadeout

  idx += 263;

  // Sample Header at idx
  const sampHdrIdx = idx;
  view.setUint32(sampHdrIdx, 64, true); // samplen
  view.setUint32(sampHdrIdx + 4, 0, true); // samploop
  view.setUint32(sampHdrIdx + 8, 64, true); // samplooplen
  bytes[sampHdrIdx + 12] = 64; // sampvol
  bytes[sampHdrIdx + 13] = 0; // sampfinetune
  bytes[sampHdrIdx + 14] = 1; // samptype (forward loop)
  bytes[sampHdrIdx + 15] = 128; // samppan
  bytes[sampHdrIdx + 16] = 0; // sampnote
  writeAscii(sampHdrIdx + 18, 'Square Wave', 22);

  idx += 40;

  // Sample waveform data at idx (64 bytes)
  bytes[idx] = 64;
  bytes[idx + 32] = 128; // delta -128

  return buffer;
}

let sampleBuffer: ArrayBuffer | null = null;

const getSampleBuffer = (): ArrayBuffer => {
  if (!sampleBuffer) {
    sampleBuffer = buildSampleXMBuffer();
  }
  return sampleBuffer.slice(0);
};

describe('XMPlayer', () => {
  beforeAll(() => {
    sampleBuffer = buildSampleXMBuffer();
  });

  it('instantiates cleanly with default options', () => {
    const player = new XMPlayer();
    expect(player).toBeDefined();
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBe('');
    expect(player.numChannels).toBe(0);
    expect(player.getProgress()).toBe(0);
  });

  it('loads and parses sample XM file from memory buffer', () => {
    const player = new XMPlayer();
    const success = player.loadBuffer(getSampleBuffer());

    expect(success).toBe(true);
    expect(player.numChannels).toBeGreaterThan(0);
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBeTruthy();

    const instruments = player.getInstruments();
    expect(instruments.length).toBeGreaterThan(0);
    expect(instruments.some((inst) => inst.name.length > 0)).toBe(true);
    const instWithNamedSample = instruments.find(
      (inst) =>
        inst.samples.length > 0 && inst.samples.some((s) => s.name.length > 0)
    );
    expect(instWithNamedSample).toBeDefined();
    expect(instWithNamedSample?.samples.some((s) => s.name.length > 0)).toBe(
      true
    );
  });

  it('initializes with mock AudioContext and controls playback lifecycle', () => {
    const arrayBuffer = getSampleBuffer();

    const connectedNodes: unknown[] = [];
    const mockAudioContext = {
      sampleRate: 44100,
      createGain: () => ({
        gain: { value: 1.0 },
        connect: (target: unknown) => connectedNodes.push(target)
      }),
      createScriptProcessor: () => ({
        connect: (target: unknown) => connectedNodes.push(target),
        disconnect: () => {}
      }),
      destination: {}
    } as unknown as AudioContext;

    const player = new XMPlayer();
    const outputGain = player.init(mockAudioContext);

    expect(outputGain).toBeDefined();
    expect(player.outputNode).toBe(outputGain);

    player.loadBuffer(arrayBuffer);
    expect(player.isPlaying).toBe(false);

    player.play();
    expect(player.isPlaying).toBe(true);

    player.setVolume(0.5);
    expect(outputGain?.gain.value).toBe(0.5);

    player.pause();
    expect(player.isPlaying).toBe(false);

    player.stop();
    expect(player.isPlaying).toBe(false);
    expect(player.getProgress()).toBe(0);
  });

  it('does not fire onEnded prematurely during initial pattern playback', () => {
    const arrayBuffer = getSampleBuffer();

    let endedCalled = false;
    let processCallback: ((e: unknown) => void) | null = null;
    const mockAudioContext = {
      sampleRate: 44100,
      createGain: () => ({
        gain: { value: 1.0 },
        connect: () => {}
      }),
      createScriptProcessor: () => ({
        connect: () => {},
        disconnect: () => {},
        set onaudioprocess(cb: (e: unknown) => void) {
          processCallback = cb;
        }
      }),
      destination: {}
    } as unknown as AudioContext;

    const player = new XMPlayer({
      onEnded: () => {
        endedCalled = true;
      }
    });

    player.init(mockAudioContext);
    player.loadBuffer(arrayBuffer);
    player.play();

    expect(processCallback).toBeDefined();

    const buflen = 4096;
    const mockEvent = {
      outputBuffer: {
        length: buflen,
        getChannelData: () => new Float32Array(buflen)
      }
    };

    for (let i = 0; i < 25; i++) {
      processCallback!(mockEvent);
    }

    expect(endedCalled).toBe(false);
    expect(player.getProgress()).toBeGreaterThan(0);
  });

  it('returns tracker state with songpats conditionally based on includeSongpats', () => {
    const player = new XMPlayer();
    player.loadBuffer(getSampleBuffer());

    const stateDefault = player.getTrackerState();
    expect(stateDefault.songpats.length).toBeGreaterThan(0);

    const stateIncluded = player.getTrackerState(true);
    expect(stateIncluded.songpats).toEqual(stateDefault.songpats);

    const stateExcluded = player.getTrackerState(false);
    expect(stateExcluded.songpats).toEqual([]);
    expect(stateExcluded.songlen).toBe(stateDefault.songlen);
    expect(stateExcluded.bpm).toBe(stateDefault.bpm);
  });
});
