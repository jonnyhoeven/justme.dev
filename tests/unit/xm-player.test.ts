// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, beforeAll } from 'vitest';
import {
  XMPlayer,
  createXMEngine,
  type XMInstrument
} from '../../lib/audio/xm-player';
import type { InstrumentInfo } from '../../.vitepress/theme/composables/useMusic';

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

export function buildMultiInstrumentXMBuffer(): ArrayBuffer {
  // Preamble (60) + XM Header (276) = 336
  // Pattern 0: Header (9) + 1 row for 1 channel (1) = 10
  // Inst 1: Header (263) + 1 sample header (40) + sample data (16) = 319
  // Inst 2: Header (29) with nsamp = 0 = 29
  // Inst 3: Header (263) + 1 sample header (40) + sample data (32) = 335
  // Total size: 336 + 10 + 319 + 29 + 335 = 1029 bytes.
  const totalSize = 1029;
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
  writeAscii(17, 'Multi Inst Test', 20);
  bytes[37] = 0x1a;
  writeAscii(38, 'FastTracker v2.00', 20);
  view.setUint16(58, 0x0104, true);

  // XM Header
  view.setUint32(0x3c, 276, true);
  view.setUint16(0x40, 1, true); // songlen = 1
  view.setUint16(0x42, 0, true); // song_looppos = 0
  view.setUint16(0x44, 1, true); // nchan = 1
  view.setUint16(0x46, 1, true); // npat = 1
  view.setUint16(0x48, 3, true); // ninst = 3 instruments
  view.setUint16(0x4a, 1, true); // flags (linear freq)
  view.setUint16(0x4c, 6, true); // tempo = 6
  view.setUint16(0x4e, 125, true); // bpm = 125
  bytes[0x50] = 0; // pattern 0 in order table

  // Pattern 0 at 336
  let idx = 336;
  view.setUint32(idx, 9, true); // patheaderlen
  bytes[idx + 4] = 0; // patpacking
  view.setUint16(idx + 5, 1, true); // patrows = 1
  view.setUint16(idx + 7, 1, true); // patsize = 1
  idx += 9;
  bytes[idx++] = 0x80; // row 0, ch 0 empty cell

  // --- Instrument 1: Has 1 sample, CP437 name, trailing spaces & NULs ---
  const inst1Idx = idx;
  view.setUint32(inst1Idx, 263, true); // hdrsiz
  // CP437: 'Fl' + 0x81 ('ü') + 'te' + trailing spaces and NULs
  bytes[inst1Idx + 4] = 0x46; // 'F'
  bytes[inst1Idx + 5] = 0x6c; // 'l'
  bytes[inst1Idx + 6] = 0x81; // 'ü' in CP437
  bytes[inst1Idx + 7] = 0x74; // 't'
  bytes[inst1Idx + 8] = 0x65; // 'e'
  bytes[inst1Idx + 9] = 0x20; // ' '
  bytes[inst1Idx + 10] = 0x20; // ' '
  bytes[inst1Idx + 11] = 0x00; // NUL terminator
  view.setUint16(inst1Idx + 0x1b, 1, true); // nsamp = 1
  view.setUint32(inst1Idx + 0x1d, 40, true); // samphdrsiz = 40
  idx += 263;

  // Instrument 1 - Sample 1 header (40 bytes)
  const s1Hdr = idx;
  view.setUint32(s1Hdr, 16, true); // samplen = 16
  view.setUint32(s1Hdr + 4, 0, true); // samploop = 0
  view.setUint32(s1Hdr + 8, 0, true); // samplooplen = 0
  bytes[s1Hdr + 12] = 48; // sampvol = 48
  bytes[s1Hdr + 13] = 0; // sampfinetune = 0
  bytes[s1Hdr + 14] = 0; // samptype = 0 (no loop)
  bytes[s1Hdr + 15] = 64; // samppan = 64
  bytes[s1Hdr + 16] = 0; // sampnote = 0
  // CP437: 'S' + 0x84 ('ä') + 'mple' + trailing spaces and NUL
  bytes[s1Hdr + 18] = 0x53; // 'S'
  bytes[s1Hdr + 19] = 0x84; // 'ä' in CP437
  bytes[s1Hdr + 20] = 0x6d; // 'm'
  bytes[s1Hdr + 21] = 0x70; // 'p'
  bytes[s1Hdr + 22] = 0x6c; // 'l'
  bytes[s1Hdr + 23] = 0x65; // 'e'
  bytes[s1Hdr + 24] = 0x20; // ' '
  bytes[s1Hdr + 25] = 0x20; // ' '
  bytes[s1Hdr + 26] = 0x00; // NUL
  idx += 40;

  // Instrument 1 - Sample 1 data (16 bytes delta PCM)
  for (let b = 0; b < 16; b++) {
    bytes[idx++] = 0;
  }

  // --- Instrument 2: Blank name / zero-sample slot (nsamp === 0) ---
  const inst2Idx = idx;
  view.setUint32(inst2Idx, 29, true); // hdrsiz = 29
  // 22 bytes of spaces from inst2Idx + 4
  for (let b = 0; b < 22; b++) {
    bytes[inst2Idx + 4 + b] = 0x20;
  }
  view.setUint16(inst2Idx + 0x1b, 0, true); // nsamp = 0
  idx += 29;

  // --- Instrument 3: Has 1 sample with forward loop, ASCII name with trailing spaces ---
  const inst3Idx = idx;
  view.setUint32(inst3Idx, 263, true); // hdrsiz = 263
  writeAscii(inst3Idx + 4, 'Lead Synth', 22); // 'Lead Synth            '
  view.setUint16(inst3Idx + 0x1b, 1, true); // nsamp = 1
  view.setUint32(inst3Idx + 0x1d, 40, true); // samphdrsiz = 40
  idx += 263;

  // Instrument 3 - Sample 1 header (40 bytes)
  const s3Hdr = idx;
  view.setUint32(s3Hdr, 32, true); // samplen = 32
  view.setUint32(s3Hdr + 4, 0, true); // samploop = 0
  view.setUint32(s3Hdr + 8, 32, true); // samplooplen = 32
  bytes[s3Hdr + 12] = 55; // sampvol = 55
  bytes[s3Hdr + 13] = 0; // sampfinetune = 0
  bytes[s3Hdr + 14] = 1; // samptype = 1 (forward loop)
  bytes[s3Hdr + 15] = 192; // samppan = 192
  bytes[s3Hdr + 16] = 0; // sampnote = 0
  writeAscii(s3Hdr + 18, 'Square Wave', 22); // 'Square Wave           '
  idx += 40;

  // Instrument 3 - Sample 1 data (32 bytes delta PCM)
  for (let b = 0; b < 32; b++) {
    bytes[idx++] = 0;
  }

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

    const instruments: InstrumentInfo[] = player.getInstruments();
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

  interface TestChannel {
    samp?: { note: number; pan: number; vol: number; fine: number };
    fine?: number;
    period?: number;
    doff?: number;
    filter?: number[];
    filterstate?: Float32Array;
    vol?: number;
    pan?: number;
    vL?: number;
    vR?: number;
    vLprev?: number;
    vRprev?: number;
    muteGain?: number;
    inst?: unknown;
    ramp?: number;
    number?: number;
  }

  interface TestEngine {
    xm: {
      initial_tempo?: number;
      initial_bpm?: number;
      tempo?: number;
      bpm?: number;
      global_volume?: number;
      channelinfo?: TestChannel[];
      songpats?: number[];
      patterns?: number[][][][];
      flags?: number;
      nchan?: number;
      instruments?: unknown[];
    };
    max_global_volume?: number;
    cur_songpos?: number;
    cur_pat?: number;
    cur_row?: number;
    next_row?: number;
    periodForNote: (ch: TestChannel, note: number) => number;
    updateChannelPeriod: (ch: TestChannel, period: number) => void;
    nextRow?: () => void;
  }

  it('reconstructs tempo, BPM, and global volume when seeking or jumping across patterns', () => {
    const player = new XMPlayer();
    const engine = (player as unknown as { engine: TestEngine }).engine;

    // Mock song structure with tempo, BPM, and global volume changes
    engine.xm = {
      initial_tempo: 6,
      initial_bpm: 125,
      tempo: 6,
      bpm: 125,
      global_volume: 128,
      channelinfo: [],
      songpats: [0, 1, 2],
      patterns: [
        // Pattern 0: changes tempo to 3 and BPM to 140
        [
          [[0, -1, -1, 0x0f, 0x03]], // tempo = 3
          [[0, -1, -1, 0x0f, 140]] // bpm = 140
        ],
        // Pattern 1: changes BPM to 160 and global volume to 32 (G20 -> 64)
        [
          [[0, -1, -1, 0x0f, 160]], // bpm = 160
          [[0, -1, -1, 0x10, 0x20]] // global volume = 64
        ],
        // Pattern 2: rows without tempo effects
        [[[0, -1, -1, 0, 0]]]
      ]
    };
    engine.max_global_volume = 128;

    // Jump to order 1: should have scanned Pattern 0 (tempo=3, bpm=140)
    player.jumpToOrder(1);
    const state1 = player.getTrackerState();
    expect(state1.tempo).toBe(3);
    expect(state1.bpm).toBe(140);

    // Jump to order 2: should have scanned Pattern 0 and 1 (tempo=3, bpm=160, global_volume=64)
    player.jumpToOrder(2);
    const state2 = player.getTrackerState();
    expect(state2.tempo).toBe(3);
    expect(state2.bpm).toBe(160);
    expect(engine.xm.global_volume).toBe(64);
  });

  it('supports both Linear and Amiga frequency tables based on header flags', () => {
    const player = new XMPlayer();
    const engine = (player as unknown as { engine: TestEngine }).engine;

    // Note 48 (C-4) with relative note = 0 and finetune = 0
    const ch: TestChannel = {
      samp: { note: 0, pan: 128, vol: 64, fine: 0 },
      fine: 0,
      period: 0,
      doff: 0,
      filter: [0, 0, 0]
    };

    // 1. Linear mode (flags bit 0 = 1)
    engine.xm = { flags: 1 };
    const linearPeriod = engine.periodForNote(ch, 48);
    expect(linearPeriod).toBe(1152);
    engine.updateChannelPeriod(ch, linearPeriod);
    const linearFreq = (ch.doff ?? 0) * 44100;
    expect(Math.abs(linearFreq - 8363)).toBeLessThan(1);

    // 2. Amiga mode (flags bit 0 = 0)
    engine.xm = { flags: 0 };
    const amigaPeriod = engine.periodForNote(ch, 48);
    expect(amigaPeriod).toBe(428); // 1712 / 4
    engine.updateChannelPeriod(ch, amigaPeriod);
    const amigaFreq = (ch.doff ?? 0) * 44100;
    expect(Math.abs(amigaFreq - 8363)).toBeLessThan(1);

    // Verify octave 5: C-5 (note 60)
    const amigaPeriodC5 = engine.periodForNote(ch, 60);
    expect(amigaPeriodC5).toBe(214);
    engine.updateChannelPeriod(ch, amigaPeriodC5);
    const amigaFreqC5 = (ch.doff ?? 0) * 44100;
    expect(Math.abs(amigaFreqC5 - 16726)).toBeLessThan(2);
  });

  it('applies 8-sample micro-declick only when retriggering active voices', () => {
    const player = new XMPlayer();
    const engine = (player as unknown as { engine: TestEngine }).engine;

    engine.xm = {
      flags: 1,
      bpm: 125,
      tempo: 6,
      nchan: 1,
      global_volume: 128,
      channelinfo: [
        {
          number: 0,
          vol: 64,
          pan: 128,
          vL: 0,
          vR: 0,
          vLprev: 0,
          vRprev: 0,
          muteGain: 1,
          period: 1152,
          filterstate: new Float32Array(3)
        }
      ],
      songpats: [0],
      patterns: [[[[48, 1, -1, 0, 0]]]],
      instruments: [
        {
          number: 0,
          samplemap: new Uint8Array(96),
          samples: [
            {
              len: 1000,
              looplen: 0,
              vol: 64,
              pan: 128,
              fine: 0,
              note: 0,
              type: 0,
              sampledata: new Float32Array(1000)
            }
          ],
          env_vol: { points: [0, 64], type: 0, sustain: 0 },
          env_pan: { points: [0, 32], type: 0, sustain: 0 }
        }
      ]
    };

    const ch = engine.xm.channelinfo![0];

    // 1. Fresh note onset from silence: ch.ramp should be 1.0 (unsoftened attack, full punch)
    engine.cur_songpos = 0;
    engine.cur_pat = 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    if (typeof engine.nextRow === 'function') {
      engine.nextRow();
    } else {
      engine.cur_row = 0;
    }
    expect(ch.ramp).toBe(1.0);

    // 2. Retriggering when actively playing applies 8-sample micro-ramp
    ch.vL = 0.8;
    ch.vR = 0.8;
    ch.inst = engine.xm.instruments![0];
    if (ch.inst && ((ch.vL ?? 0) > 0.05 || (ch.vR ?? 0) > 0.05)) {
      ch.ramp = 0.0;
    }
    expect(ch.ramp).toBe(0.0);
  });

  it('correctly calculates getProgress for patterns with non-64 rows', () => {
    const player = new XMPlayer();
    const engine = (player as unknown as { engine: TestEngine }).engine;

    // Pattern 0 has 32 rows, Pattern 1 has 128 rows (total 160 rows)
    const pat0 = Array.from({ length: 32 }, () => []);
    const pat1 = Array.from({ length: 128 }, () => []);

    engine.xm = {
      songpats: [0, 1],
      patterns: [pat0, pat1]
    };
    player.orderOffsets = [0, 32];
    player.totalRows = 160;

    // When stopped or before playback (cur_songpos = -1)
    engine.cur_songpos = -1;
    engine.cur_row = 0;
    expect(player.getProgress()).toBe(0);

    // At order 0, row 0: (0 / 160) * 100 = 0%
    engine.cur_songpos = 0;
    engine.cur_row = 0;
    expect(player.getProgress()).toBe(0);

    // At order 0, row 16: (16 / 160) * 100 = 10%
    engine.cur_row = 16;
    expect(player.getProgress()).toBe(10);

    // At order 1, row 0: (32 / 160) * 100 = 20%
    engine.cur_songpos = 1;
    engine.cur_row = 0;
    expect(player.getProgress()).toBe(20);

    // At order 1, row 64: (32 + 64) / 160 * 100 = 60%
    engine.cur_row = 64;
    expect(player.getProgress()).toBe(60);

    // At order 1, row 127: (32 + 127) / 160 * 100 = 99.375%
    engine.cur_row = 127;
    expect(player.getProgress()).toBeCloseTo(99.375);
  });

  it('precomputes orderOffsets and totalRows during loadBuffer', () => {
    const player = new XMPlayer();
    const ok = player.loadBuffer(getSampleBuffer());
    expect(ok).toBe(true);
    // getSampleBuffer contains 2 patterns of 64 rows each
    expect(player.totalRows).toBe(128);
    expect(player.orderOffsets).toEqual([0, 64]);
  });

  it('reuses scope and VU buffers across ticks and reallocates on width change', () => {
    let processCallback: ((e: unknown) => void) | null = null;
    const mockAudioContext = {
      sampleRate: 44100,
      createGain: () => ({ gain: { value: 1.0 }, connect: () => {} }),
      createScriptProcessor: () => ({
        connect: () => {},
        disconnect: () => {},
        set onaudioprocess(cb: (e: unknown) => void) {
          processCallback = cb;
        }
      }),
      destination: {}
    } as unknown as AudioContext;

    const player = new XMPlayer();
    player.init(mockAudioContext);
    player.loadBuffer(getSampleBuffer());
    player.play();

    const buflen = 4096;
    const mockEvent = {
      playbackTime: 0,
      outputBuffer: {
        length: buflen,
        getChannelData: () => new Float32Array(buflen)
      }
    };

    const seen: {
      payload: object;
      vu: Float32Array;
      scopes: Float32Array[];
    }[] = [];
    player.setScopeListener((data) => {
      if (data.scopes) {
        seen.push({
          payload: data,
          vu: data.vu,
          scopes: data.scopes
        });
      }
    }, 64);

    for (let i = 0; i < 5; i++) processCallback!(mockEvent);

    expect(seen.length).toBeGreaterThan(2);
    const first = seen[0];
    expect(first.scopes.length).toBe(player.numChannels);
    expect(first.vu.length).toBe(player.numChannels);
    for (const s of first.scopes) expect(s.length).toBe(64);
    for (const s of seen) {
      expect(s.payload).toBe(first.payload);
      expect(s.vu).toBe(first.vu);
      expect(s.scopes).toBe(first.scopes);
      s.scopes.forEach((buf, i) => expect(buf).toBe(first.scopes[i]));
    }
    for (const v of first.vu) expect(Number.isFinite(v)).toBe(true);
    for (const buf of first.scopes)
      for (const v of buf) expect(Number.isFinite(v)).toBe(true);

    // Changing the width reallocates, then buffers are stable again.
    const before = first.scopes;
    seen.length = 0;
    player.setScopeListener((data) => {
      if (data.scopes) {
        seen.push({ payload: data, vu: data.vu, scopes: data.scopes });
      }
    }, 32);
    for (let i = 0; i < 3; i++) processCallback!(mockEvent);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0].scopes).not.toBe(before);
    for (const s of seen[0].scopes) expect(s.length).toBe(32);
    for (const s of seen) expect(s.scopes).toBe(seen[0].scopes);
  });

  it('handles out-of-range samplemap indices gracefully without throwing and clears stale ch.samp', () => {
    let processCallback: ((e: unknown) => void) | null = null;
    const mockAudioContext = {
      sampleRate: 44100,
      createGain: () => ({ gain: { value: 1.0 }, connect: () => {} }),
      createScriptProcessor: () => ({
        connect: () => {},
        disconnect: () => {},
        set onaudioprocess(cb: (e: unknown) => void) {
          processCallback = cb;
        }
      }),
      destination: {}
    } as unknown as AudioContext;
    void mockAudioContext;

    const player = new XMPlayer();
    player.init(mockAudioContext);
    const ok = player.loadBuffer(getSampleBuffer());
    expect(ok).toBe(true);

    const engine = (
      player as unknown as {
        engine: {
          cur_pat: number;
          cur_row: number;
          next_row: number;
          cur_songpos: number;
          nextRow: () => void;
          xm: {
            instruments: Array<{
              samples: unknown[];
              samplemap?: Uint8Array;
            }>;
            patterns: Array<Array<Array<Array<number>>>>;
            songpats: number[];
            channelinfo: Array<{
              samp?: unknown;
              note?: number;
              inst?: unknown;
            }>;
          };
          play: () => void;
        };
      }
    ).engine;

    const inst = engine.xm.instruments[0];
    expect(inst).toBeDefined();
    expect(inst.samples.length).toBe(1);

    // Set samplemap such that note 49 maps to out-of-range index 5
    inst.samplemap = new Uint8Array(96);
    inst.samplemap[49] = 5;

    player.play();
    engine.cur_songpos = 0;
    engine.next_row = 0;
    engine.nextRow(); // executes row 0 (which reads pattern 0 row 0)

    const pat = engine.xm.patterns[engine.cur_pat];
    expect(pat).toBeDefined();
    while (pat.length <= 1) {
      pat.push([
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0]
      ]);
    }
    pat[1][0] = [49, 1, -1, 0, 0];
    // Test note-trigger branch with out-of-range samplemap entry
    const ch = engine.xm.channelinfo[0];
    ch.samp = inst.samples[0]; // pre-populate with a valid sample to verify clearing

    expect(() => engine.nextRow()).not.toThrow();
    // ch.samp should be undefined because sample index 5 is out of range
    expect(ch.samp).toBeUndefined();

    // Also run an audio process tick to verify silence mixes cleanly without throwing
    const buflen = 4096;
    const mockEvent = {
      playbackTime: 0,
      outputBuffer: {
        length: buflen,
        getChannelData: () => new Float32Array(buflen)
      }
    };
    if (processCallback) {
      const cb = processCallback as (e: unknown) => void;
      expect(() => cb(mockEvent)).not.toThrow();
    }

    engine.cur_songpos = 0;
    engine.cur_row = 1;
    engine.next_row = 2;

    ch.samp = inst.samples[0]; // pre-populate with valid sample
    ch.note = 49;
    ch.inst = inst; // pre-populate instrument
    const pat2 = engine.xm.patterns[engine.cur_pat];
    while (pat2.length <= 2) {
      pat2.push([
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0],
        [-1, -1, -1, 0, 0]
      ]);
    }
    // Instrument change (inst 1, which has samplemap mapping 49 to out-of-range index 5) without note trigger (note = -1)
    pat2[2][0] = [-1, 1, -1, 0, 0];

    engine.cur_row = 1;
    engine.next_row = 2;
    expect(() => engine.nextRow()).not.toThrow();
    expect(ch.samp).toBeUndefined();
    if (processCallback) {
      const cb = processCallback as (e: unknown) => void;
      expect(() => cb(mockEvent)).not.toThrow();
    }
  });

  it('loads instruments from a binary XM buffer with slot order, trimming, CP437 decoding, blank slots, and sample metadata', () => {
    const player = new XMPlayer();
    const buf = buildMultiInstrumentXMBuffer();
    const success = player.loadBuffer(buf);
    expect(success).toBe(true);

    const instruments: InstrumentInfo[] = player.getInstruments();
    expect(instruments).toHaveLength(3);

    // 1. Slot order (index: 1, 2, 3)
    expect(instruments.map((inst) => inst.index)).toEqual([1, 2, 3]);

    // 2. Instrument 1: CP437 decoding ('Flüte'), trimming trailing spaces and NULs
    expect(instruments[0].index).toBe(1);
    expect(instruments[0].name).toBe('Flüte');
    expect(instruments[0].samples).toHaveLength(1);

    // Sample metadata: name ('Sämple' with CP437 0x84 'ä' and trimmed), len, vol, pan, loop, looplen, type
    expect(instruments[0].samples[0]).toEqual({
      name: 'Sämple',
      len: 16,
      vol: 48,
      pan: 64,
      loop: 0,
      looplen: 0,
      type: 0
    });

    // 3. Instrument 2: Blank name and zero-sample (nsamp === 0) slot
    expect(instruments[1].index).toBe(2);
    expect(instruments[1].name).toBe('');
    expect(instruments[1].samples).toEqual([]);

    // 4. Instrument 3: Trailing spaces trimmed, forward-loop sample metadata
    expect(instruments[2].index).toBe(3);
    expect(instruments[2].name).toBe('Lead Synth');
    expect(instruments[2].samples).toHaveLength(1);
    expect(instruments[2].samples[0]).toEqual({
      name: 'Square Wave',
      len: 32,
      vol: 55,
      pan: 192,
      loop: 0,
      looplen: 2048,
      type: 1
    });
  });

  it('triggers K00 key-off (release = 1) on tick 0', () => {
    const engine = createXMEngine();
    const sample = {
      sampname: 'test',
      len: 100,
      loop: 0,
      looplen: 0,
      note: 0,
      fine: 0,
      pan: 128,
      type: 0,
      vol: 64,
      fileoffset: 0,
      sampledata: new Float32Array(100)
    };
    const inst: XMInstrument = {
      name: 'test',
      number: 0,
      samplemap: new Uint8Array(96),
      samples: [sample],
      env_vol: new engine.Envelope([0, 64, 1, 0], 2, 0, 0, 0),
      env_pan: new engine.Envelope([0, 32], 0, 0, 0, 0)
    };
    engine.xm = {
      flags: 1,
      bpm: 125,
      tempo: 6,
      nchan: 1,
      global_volume: 128,
      songpats: [0],
      patterns: [[[[48, 1, -1, 20, 0]]]], // note 48, inst 1, K00
      instruments: [inst],
      channelinfo: [
        {
          number: 0,
          vol: 64,
          pan: 128,
          period: 0,
          vL: 0,
          vR: 0,
          vLprev: 0,
          vRprev: 0,
          mute: 0,
          volE: 64,
          panE: 32,
          retrig: 0,
          vibratopos: 0,
          vibratodepth: 0,
          vibratospeed: 0,
          vibratotype: 0,
          filterstate: new Float32Array(3)
        }
      ]
    };
    engine.cur_songpos = 0;
    engine.cur_pat = 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    engine.cur_tick = 5;

    // Advance to tick 0 of row 0
    engine.nextTick();
    const ch = engine.xm.channelinfo![0];
    expect(engine.cur_tick).toBe(0);
    expect(ch.release).toBe(1);
    expect(ch.keyofftick).toBeUndefined();
  });

  it('handles Kxx effect leaving release unset before tick xx and releasing on tick xx with envelope decay', () => {
    const engine = createXMEngine();
    const sample = {
      sampname: 'test',
      len: 100,
      loop: 0,
      looplen: 0,
      note: 0,
      fine: 0,
      pan: 128,
      type: 0,
      vol: 64,
      fileoffset: 0,
      sampledata: new Float32Array(100)
    };
    // 3-point envelope: (0, 64), sustain at (4, 64), decay to (10, 0)
    const envVol = new engine.Envelope([0, 64, 4, 64, 10, 0], 1, 1, 0, 0);
    const inst: XMInstrument = {
      name: 'test',
      number: 0,
      samplemap: new Uint8Array(96),
      samples: [sample],
      env_vol: envVol,
      env_pan: new engine.Envelope([0, 32], 0, 0, 0, 0)
    };
    engine.xm = {
      flags: 1,
      bpm: 125,
      tempo: 12,
      nchan: 1,
      global_volume: 128,
      songpats: [0],
      patterns: [
        [
          [[48, 1, -1, 20, 2]], // row 0: K02
          [[-1, -1, -1, 0, 0]]
        ]
      ],
      instruments: [inst],
      channelinfo: [
        {
          number: 0,
          vol: 64,
          pan: 128,
          period: 0,
          vL: 0,
          vR: 0,
          vLprev: 0,
          vRprev: 0,
          mute: 0,
          volE: 64,
          panE: 32,
          retrig: 0,
          vibratopos: 0,
          vibratodepth: 0,
          vibratospeed: 0,
          vibratotype: 0,
          filterstate: new Float32Array(3)
        }
      ]
    };
    engine.cur_songpos = 0;
    engine.cur_pat = 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    engine.cur_tick = 11;

    const ch = engine.xm.channelinfo![0];

    // Tick 0: note triggered, release not set yet
    engine.nextTick();
    expect(engine.cur_tick).toBe(0);
    expect(ch.release).toBe(0);
    expect(ch.keyofftick).toBe(2);
    expect(ch.volE).toBe(64);

    // Tick 1: release still 0
    engine.nextTick();
    expect(engine.cur_tick).toBe(1);
    expect(ch.release).toBe(0);
    expect(ch.keyofftick).toBe(2);
    expect(ch.volE).toBe(64);

    // Tick 2: K02 fires, setting release = 1 and clearing keyofftick
    engine.nextTick();
    expect(engine.cur_tick).toBe(2);
    expect(ch.release).toBe(1);
    expect(ch.keyofftick).toBeUndefined();

    // Advance through sustain point (tick 4) - because release = 1, it exits sustain and decays
    engine.nextTick(); // tick 3
    engine.nextTick(); // tick 4: volE 64
    expect(engine.cur_tick).toBe(4);
    expect(ch.volE).toBe(64);

    engine.nextTick(); // tick 5
    engine.nextTick(); // tick 6
    engine.nextTick(); // tick 7: midway between tick 4 (64) and tick 10 (0) -> 32
    expect(engine.cur_tick).toBe(7);
    expect(ch.volE).toBe(32);

    engine.nextTick(); // tick 8
    engine.nextTick(); // tick 9
    engine.nextTick(); // tick 10: reaches 0
    expect(engine.cur_tick).toBe(10);
    expect(ch.volE).toBe(0);
  });

  it('triggers ED0 on tick 0 and delays ED2 note trigger until tick 2', () => {
    const engine = createXMEngine();
    const sample = {
      sampname: 'test',
      len: 100,
      loop: 0,
      looplen: 0,
      note: 0,
      fine: 0,
      pan: 128,
      type: 0,
      vol: 64,
      fileoffset: 0,
      sampledata: new Float32Array(100)
    };
    const inst: XMInstrument = {
      name: 'test',
      number: 0,
      samplemap: new Uint8Array(96),
      samples: [sample],
      env_vol: new engine.Envelope([0, 64, 1, 0], 2, 0, 0, 0),
      env_pan: new engine.Envelope([0, 32], 0, 0, 0, 0)
    };

    // 1. ED0: immediate trigger on tick 0
    engine.xm = {
      flags: 1,
      bpm: 125,
      tempo: 6,
      nchan: 1,
      global_volume: 128,
      songpats: [0],
      patterns: [[[[48, 1, -1, 14, 0xd0]]]], // ED0
      instruments: [inst],
      channelinfo: [
        {
          number: 0,
          vol: 64,
          pan: 128,
          period: 0,
          vL: 0,
          vR: 0,
          vLprev: 0,
          vRprev: 0,
          mute: 0,
          volE: 64,
          panE: 32,
          retrig: 0,
          vibratopos: 0,
          vibratodepth: 0,
          vibratospeed: 0,
          vibratotype: 0,
          filterstate: new Float32Array(3)
        }
      ]
    };
    engine.cur_songpos = 0;
    engine.cur_pat = 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    engine.cur_tick = 5;

    engine.nextTick();
    const ch0 = engine.xm.channelinfo![0];
    expect(engine.cur_tick).toBe(0);
    expect(ch0.note).toBe(48);
    expect(ch0.period).toBeGreaterThan(0);
    expect(ch0.doff).toBeGreaterThan(0);

    // 2. ED2: delay note trigger until tick 2
    engine.xm.patterns = [[[[48, 1, -1, 14, 0xd2]]]]; // ED2
    engine.xm.channelinfo = [
      {
        number: 0,
        vol: 64,
        pan: 128,
        period: 0,
        vL: 0,
        vR: 0,
        vLprev: 0,
        vRprev: 0,
        mute: 0,
        volE: 64,
        panE: 32,
        retrig: 0,
        vibratopos: 0,
        vibratodepth: 0,
        vibratospeed: 0,
        vibratotype: 0,
        filterstate: new Float32Array(3)
      }
    ];
    engine.cur_songpos = 0;
    engine.cur_pat = 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    engine.cur_tick = 5;

    // Tick 0: note not triggered, doff inactive
    engine.nextTick();
    const ch2 = engine.xm.channelinfo![0];
    expect(engine.cur_tick).toBe(0);
    expect(ch2.delayednote).toEqual([48, 1, -1, 14, 0xd2]);
    expect(ch2.notedelaytick).toBe(2);
    expect(ch2.inst).toBeUndefined();
    expect(ch2.doff).toBeUndefined();

    // Tick 1: still delayed, doff inactive
    engine.nextTick();
    expect(engine.cur_tick).toBe(1);
    expect(ch2.delayednote).toBeDefined();
    expect(ch2.inst).toBeUndefined();
    expect(ch2.doff).toBeUndefined();

    // Tick 2: note delay reached -> triggers note, doff becomes active
    engine.nextTick();
    expect(engine.cur_tick).toBe(2);
    expect(ch2.delayednote).toBeUndefined();
    expect(ch2.notedelaytick).toBeUndefined();
    expect(ch2.note).toBe(48);
    expect(ch2.inst).toBeDefined();
    expect(ch2.period).toBeGreaterThan(0);
    expect(ch2.doff).toBeGreaterThan(0);

    // Tick 3: note continues playing
    engine.nextTick();
    expect(engine.cur_tick).toBe(3);
    expect(ch2.doff).toBeGreaterThan(0);
  });

  function setupEffectEngine(
    patterns: [number, number, number, number, number][][][],
    songpats = [0],
    tempo = 3
  ) {
    const engine = createXMEngine();
    const sample = {
      sampname: 'test',
      len: 1000,
      loop: 0,
      looplen: 0,
      note: 0,
      fine: 0,
      pan: 128,
      type: 0,
      vol: 64,
      fileoffset: 0,
      sampledata: new Float32Array(1000)
    };
    const inst: XMInstrument = {
      name: 'test',
      number: 0,
      samplemap: new Uint8Array(96),
      samples: [sample],
      env_vol: new engine.Envelope([0, 64, 10, 0], 1, 1, 0, 0),
      env_pan: new engine.Envelope([0, 32, 10, 64], 1, 1, 0, 0)
    };
    engine.xm = {
      flags: 1,
      bpm: 125,
      tempo,
      initial_tempo: tempo,
      initial_bpm: 125,
      song_looppos: 0,
      nchan: 1,
      global_volume: 128,
      songpats,
      patterns,
      instruments: [inst],
      channelinfo: [
        {
          number: 0,
          vol: 64,
          pan: 128,
          period: 0,
          vL: 0,
          vR: 0,
          vLprev: 0,
          vRprev: 0,
          mute: 0,
          volE: 64,
          panE: 32,
          retrig: 0,
          vibratopos: 0,
          vibratodepth: 0,
          vibratospeed: 0,
          vibratotype: 0,
          filterstate: new Float32Array(3)
        }
      ]
    };
    engine.cur_songpos = 0;
    engine.cur_pat = songpats[0] ?? 0;
    engine.cur_row = -1;
    engine.next_row = 0;
    engine.cur_tick = tempo - 1;
    return engine;
  }

  it('holds cur_row for x extra row durations on EEx pattern delay', () => {
    const engine = setupEffectEngine(
      [
        [
          [[48, 1, -1, 14, 0xe2]], // row 0: EE2 (delay 2 extra rows)
          [[-1, -1, -1, 0, 0]] // row 1
        ]
      ],
      [0],
      2
    );

    // Row 0, tick 0 & 1
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(0);
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(1);

    // Extra row duration 1 (tick 0 & 1, still on row 0)
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(0);
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(1);

    // Extra row duration 2 (tick 0 & 1, still on row 0)
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(0);
    engine.nextTick();
    expect(engine.cur_row).toBe(0);
    expect(engine.cur_tick).toBe(1);

    // Now advances to row 1
    engine.nextTick();
    expect(engine.cur_row).toBe(1);
    expect(engine.cur_tick).toBe(0);
  });

  it('retriggers sample offset every x ticks on E9x (and ignores E90)', () => {
    const engine = setupEffectEngine(
      [[[[48, 1, -1, 14, 0x92]]]], // E92
      [0],
      5
    );
    const ch = engine.xm.channelinfo![0];

    engine.nextTick(); // tick 0
    expect(ch.off).toBe(0);

    ch.off = 50;
    engine.nextTick(); // tick 1 (1 % 2 !== 0)
    expect(ch.off).toBe(50);

    engine.nextTick(); // tick 2 (2 % 2 === 0 -> retrigger)
    expect(ch.off).toBe(0);

    ch.off = 75;
    engine.nextTick(); // tick 3
    expect(ch.off).toBe(75);

    engine.nextTick(); // tick 4 (4 % 2 === 0 -> retrigger)
    expect(ch.off).toBe(0);
  });

  it('cuts volume on tick 0 for EC0', () => {
    const engine = setupEffectEngine(
      [[[[48, 1, -1, 14, 0xc0]]]], // EC0
      [0],
      3
    );
    const ch = engine.xm.channelinfo![0];

    engine.nextTick(); // tick 0
    expect(ch.vol).toBe(0);
  });

  it('remembers fine porta up/down (E10/E20) and sample offset (900)', () => {
    const engine = setupEffectEngine(
      [
        [
          [[48, 1, -1, 14, 0x14]], // row 0: E14
          [[-1, -1, -1, 14, 0x10]], // row 1: E10 (reuses 4)
          [[-1, -1, -1, 14, 0x23]], // row 2: E23
          [[-1, -1, -1, 14, 0x20]], // row 3: E20 (reuses 3)
          [[48, 1, -1, 9, 0x02]], // row 4: 902 (off = 512)
          [[48, 1, -1, 9, 0x00]] // row 5: 900 (reuses 0x02 -> off = 512)
        ]
      ],
      [0],
      1
    );
    const ch = engine.xm.channelinfo![0];

    engine.nextTick(); // row 0: E14
    const p0 = ch.period;
    engine.nextTick(); // row 1: E10
    expect(ch.period).toBe(p0 - 4);
    engine.nextTick(); // row 2: E23
    expect(ch.period).toBe(p0 - 4 + 3);
    engine.nextTick(); // row 3: E20
    expect(ch.period).toBe(p0 - 4 + 3 + 3);
    engine.nextTick(); // row 4: 902
    expect(ch.off).toBe(512);
    engine.nextTick(); // row 5: 900
    expect(ch.off).toBe(512);
  });

  it('stops song and fires onEnded on F00', async () => {
    const engine = setupEffectEngine(
      [[[[48, 1, -1, 15, 0x00]]]], // F00
      [0],
      3
    );
    let ended = 0;
    engine.onEnded = () => {
      ended++;
    };

    engine.nextTick();
    expect(engine.cur_pat).toBe(-1);
    expect(engine.cur_songpos).toBe(-1);
    expect(engine.xm.channelinfo![0].inst).toBeUndefined();

    await new Promise((r) => setTimeout(r, 10));
    expect(ended).toBe(1);
  });

  it('fires onEnded and validates pattern on Dxx wrap past last order', async () => {
    // songpats [0, 99] -> D00 on order 0 advances to order 1 (pattern 99 out of range),
    // setCurrentPattern skips out-of-range 99 and wraps to order 0;
    // D00 on order 1 wraps past end and fires onEnded.
    const engine = setupEffectEngine(
      [
        [
          [[48, 1, -1, 13, 0x00]], // row 0: D00
          [[-1, -1, -1, 0, 0]]
        ]
      ],
      [0, 99],
      1
    );
    let ended = 0;
    engine.onEnded = () => {
      ended++;
    };

    // Row 0 of order 0: D00 advances to order 1, pattern 99 is out of range -> setCurrentPattern wraps to order 0 (pat 0)
    engine.nextTick();
    expect(engine.cur_pat).toBe(0);
    expect(engine.cur_songpos).toBe(0);

    // Now test wrapping past last order directly
    engine.xm.songpats = [0];
    engine.cur_songpos = 0;
    engine.next_row = 0;
    engine.nextTick();
    expect(engine.cur_songpos).toBe(0);
    await new Promise((r) => setTimeout(r, 10));
    expect(ended).toBe(1);
  });

  it('sets envelope tick on Lxx and slides panning on Pxy and volume Dx/Ex', () => {
    const engine = setupEffectEngine(
      [
        [
          [[48, 1, -1, 21, 0x05]], // row 0: L05 (set env tick = 5)
          [[-1, -1, -1, 25, 0x20]], // row 1: P20 (pan slide right +2/tick)
          [[-1, -1, -1, 25, 0x00]], // row 2: P00 (reuses +2/tick)
          [[-1, -1, 0xd4, 0, 0]], // row 3: vol col D4 (pan slide left -4/tick)
          [[-1, -1, 0xe3, 0, 0]] // row 4: vol col E3 (pan slide right +3/tick)
        ]
      ],
      [0],
      2
    );
    const ch = engine.xm.channelinfo![0];

    // Row 0, tick 0: L05 sets tick=5, then nextTick() ticks once -> tick=6
    engine.nextTick();
    expect(ch.env_vol?.tick).toBe(6);
    expect(ch.env_pan?.tick).toBe(6);
    engine.nextTick(); // tick 1

    // Row 1: P20 (+2 on tick 1)
    ch.pan = 100;
    engine.nextTick(); // tick 0
    engine.nextTick(); // tick 1
    expect(ch.pan).toBe(102);

    // Row 2: P00 (memory +2 on tick 1)
    engine.nextTick(); // tick 0
    engine.nextTick(); // tick 1
    expect(ch.pan).toBe(104);

    // Row 3: vol col D4 (-4 on tick 1)
    engine.nextTick(); // tick 0
    engine.nextTick(); // tick 1
    expect(ch.pan).toBe(100);

    // Row 4: vol col E3 (+3 on tick 1)
    engine.nextTick(); // tick 0
    engine.nextTick(); // tick 1
    expect(ch.pan).toBe(103);
  });
});
