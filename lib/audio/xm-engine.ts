// SPDX-FileCopyrightText: 2015 Andy Sloane <andy@a1k0n.net> (jsxm, MIT License)
// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later AND MIT
/**
 * FastTracker 2 (.XM) Audio Engine.
 * Adapted from Andy Sloane's jsxm for modern TypeScript / ES Module environments.
 */

import { decodeCp437Byte } from './cp437';

export type XMNoteData = [
  note: number,
  inst: number,
  vol: number,
  efftype: number,
  effparam: number
];
export type XMPatternRow = XMNoteData[];
export type XMPattern = XMPatternRow[];

export interface XMSample {
  sampname: string;
  len: number;
  loop: number;
  looplen: number;
  note: number;
  fine: number;
  pan: number;
  type: number;
  vol: number;
  fileoffset: number;
  sampledata: Float32Array;
}

export class Envelope {
  points: number[];
  type: number;
  sustain: number;
  loopstart: number;
  loopend: number;

  constructor(
    points: number[],
    type: number,
    sustain: number,
    loopstart: number,
    loopend: number
  ) {
    this.points = points;
    this.type = type;
    this.sustain = sustain;
    this.loopstart = points[loopstart * 2] ?? 0;
    this.loopend = points[loopend * 2] ?? 0;
  }

  Get(ticks: number): number {
    let y0 = 0;
    const env = this.points;
    for (let i = 0; i < env.length; i += 2) {
      y0 = env[i + 1];
      if (ticks < env[i]) {
        const x0 = env[i - 2];
        y0 = env[i - 1];
        const dx = env[i] - x0;
        const dy = env[i + 1] - y0;
        return y0 + ((ticks - x0) * dy) / dx;
      }
    }
    return y0;
  }
}

export class EnvelopeFollower {
  env: Envelope;
  tick: number;

  constructor(env: Envelope) {
    this.env = env;
    this.tick = 0;
  }

  Tick(release: number): number {
    const value = this.env.Get(this.tick);

    // if we're sustaining a note, stop advancing the tick counter
    const sustainTick = this.env.points[this.env.sustain * 2];
    if (!release && sustainTick !== undefined && this.tick >= sustainTick) {
      return this.env.points[this.env.sustain * 2 + 1] ?? value;
    }

    this.tick++;
    if (this.env.type & 4) {
      // envelope loop?
      if (!release && this.tick >= this.env.loopend) {
        this.tick -= this.env.loopend - this.env.loopstart;
      }
    }
    return value;
  }
}

export interface XMInstrument {
  name: string;
  number: number;
  samplemap?: Uint8Array;
  samples?: XMSample[];
  env_vol?: Envelope;
  env_pan?: Envelope;
  vol_fadeout?: number;
  vib_type?: number;
  vib_sweep?: number;
  vib_depth?: number;
  vib_rate?: number;
}

export type XMEffectTick0Fn = (
  ch: XMChannelState,
  data: number
) => void | boolean;
export type XMEffectTick1Fn = (ch: XMChannelState) => void;

export interface XMChannelState {
  number: number;
  filterstate: Float32Array;
  vol: number;
  pan: number;
  period: number;
  vL: number;
  vR: number;
  vLprev: number;
  vRprev: number;
  mute: number;
  volE: number;
  panE: number;
  retrig: number;
  vibratopos: number;
  vibratodepth: number;
  vibratospeed: number;
  vibratotype: number;

  // Dynamic voice / effect state
  inst?: XMInstrument;
  samp?: XMSample;
  note?: number;
  fine?: number;
  off?: number;
  doff?: number;
  ramp?: number;
  filter?: [number, number, number];
  release?: number;
  keyofftick?: number;
  delayednote?: XMNoteData;
  notedelaytick?: number;
  envtick?: number;
  env_vol?: EnvelopeFollower;
  env_pan?: EnvelopeFollower;
  periodoffset?: number;
  voloffset?: number;
  periodtarget?: number;
  portaspeed?: number;
  slideupspeed?: number;
  slidedownspeed?: number;
  volumeslide?: number;
  panslide?: number;
  finevolup?: number;
  finevoldown?: number;
  fineportaup?: number;
  fineportadown?: number;
  xfineportaup?: number;
  xfineportadown?: number;
  glissando?: boolean;
  tremolopos?: number;
  tremolodepth?: number;
  tremolospeed?: number;
  tremolotype?: number;
  tremorparam?: number;
  tremorpos?: number;
  fadeout?: number;
  autovib_pos?: number;
  autovib_sweep?: number;
  sampleoffset?: number;
  loopstart?: number;
  loopend?: number;
  loopremaining?: number;
  effect?: number;
  effectdata?: number;
  effectfn?: XMEffectTick1Fn | null;
  voleffectdata?: number;
  voleffectfn?: XMEffectTick1Fn;
}

export interface XMSong {
  songname?: string;
  song_looppos?: number;
  nchan?: number;
  flags?: number;
  tempo?: number;
  bpm?: number;
  initial_tempo?: number;
  initial_bpm?: number;
  channelinfo?: XMChannelState[];
  global_volume?: number;
  global_volumeslide?: number;
  songpats?: number[];
  patterns?: XMPattern[];
  instruments?: XMInstrument[];
  xm_songlen?: number;
}

export interface XMScopeFrame {
  t: number;
  vu: Float32Array;
  scopes?: Float32Array[];
  songpos: number;
  pat: number;
  row: number;
}

export interface XMViewInternal {
  scope_width: number;
  pushEvent: ((frame: XMScopeFrame) => void) | null;
}

export interface XMEngine {
  cur_songpos: number;
  cur_pat: number;
  cur_row: number;
  next_row?: number;
  cur_ticksamp: number;
  cur_tick: number;
  pattern_delay: number;
  max_global_volume: number;
  playing: boolean;
  onEnded: (() => void) | null;
  xm: XMSong;
  XMView: XMViewInternal;
  effects_t0: XMEffectTick0Fn[];
  effects_t1: (XMEffectTick1Fn | null)[];
  periodForNote: (ch: XMChannelState, note: number) => number;
  updateChannelPeriod: (ch: XMChannelState, period: number) => void;
  prettify_effect: (t: number, p: number) => string;
  prettify_note?: (note: number) => string;
  load: (arrayBuf: ArrayBuffer) => boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  renderAudio: (
    dataL: Float32Array,
    dataR: Float32Array,
    sampleRate?: number,
    playbackTime?: number
  ) => void;
  nextTick: (f_smp?: number) => void;
  nextRow: () => void;
  Envelope: typeof Envelope;
  setCurrentPattern: () => void;
  silenceChannels: () => void;
  scanSongStateUpTo: (
    targetSongPos: number,
    targetRow?: number
  ) => { tempo: number; bpm: number; globalVolume: number };
  seekToOrder: (targetIdx: number) => void;
}

export interface XMTrackerState {
  curSongPos: number;
  curPat: number;
  curRow: number;
  bpm: number;
  tempo: number;
  songlen: number;
  songpats: number[];
  numChannels: number;
}
export type TrackerState = XMTrackerState;

export interface XMInstrumentSampleInfo {
  name: string;
  len: number;
  vol: number;
  pan: number;
  loop: number;
  looplen: number;
  type: number;
}

export interface XMInstrumentInfo {
  index: number;
  name: string;
  samples: XMInstrumentSampleInfo[];
}
export type InstrumentInfo = XMInstrumentInfo;
export type InstrumentSampleInfo = XMInstrumentSampleInfo;

export function createXMEngine(): XMEngine {
  const XMView: XMViewInternal = {
    scope_width: 0,
    pushEvent: null
  };

  let f_smp = 44100; // updated by renderAudio, default value here

  // per-sample exponential moving average for volume changes (to prevent pops
  // and clicks); evaluated every 8 samples
  const popfilter_alpha = 0.9837;

  // for pretty-printing notes
  const _note_names = [
    'C-',
    'C#',
    'D-',
    'D#',
    'E-',
    'F-',
    'F#',
    'G-',
    'G#',
    'A-',
    'A#',
    'B-'
  ];

  const AMIGA_PERIOD_TAB = [
    907, 900, 894, 887, 881, 875, 868, 862, 856, 850, 844, 838, 832, 826, 820,
    814, 808, 802, 796, 791, 785, 779, 774, 768, 762, 757, 752, 746, 741, 736,
    730, 725, 720, 715, 709, 704, 699, 694, 689, 684, 678, 675, 670, 665, 660,
    655, 651, 646, 640, 636, 632, 628, 623, 619, 614, 610, 604, 601, 597, 592,
    588, 584, 580, 575, 570, 567, 563, 559, 555, 551, 547, 543, 538, 535, 532,
    528, 524, 520, 516, 513, 508, 505, 502, 498, 494, 491, 487, 484, 480, 477,
    474, 470, 467, 463, 460, 457
  ];

  function eff_t1_0(ch: XMChannelState): void {
    // arpeggio
    if (ch.effectdata !== 0 && ch.inst !== undefined) {
      const effectdata = ch.effectdata ?? 0;
      const arpeggio = [0, effectdata >> 4, effectdata & 15];
      const note = (ch.note ?? 0) + arpeggio[player.cur_tick % 3];
      ch.period = player.periodForNote(ch, note);
    }
  }

  function eff_t0_1(ch: XMChannelState, data: number): void {
    // pitch slide up
    if (data !== 0) {
      ch.slideupspeed = data;
    }
  }

  function eff_t1_1(ch: XMChannelState): void {
    // pitch slide up
    if (ch.slideupspeed !== undefined) {
      ch.period = Math.max(1, ch.period - ch.slideupspeed);
    }
  }

  function eff_t0_2(ch: XMChannelState, data: number): void {
    // pitch slide down
    if (data !== 0) {
      ch.slidedownspeed = data;
    }
  }

  function eff_t1_2(ch: XMChannelState): void {
    // pitch slide down
    if (ch.slidedownspeed !== undefined) {
      const maxPeriod = (player.xm.flags ?? 0) & 1 ? 1920 : 6848;
      ch.period = Math.min(maxPeriod, ch.period + ch.slidedownspeed);
    }
  }

  function eff_t0_3(ch: XMChannelState, data: number): void {
    // portamento
    if (data !== 0) {
      ch.portaspeed = data;
    }
  }

  function nearestSemitonePeriod(ch: XMChannelState, period: number): number {
    if (!ch.samp) return period;
    if ((player.xm.flags ?? 0) & 1) {
      const base = periodForNote(ch, 0);
      const note = Math.max(0, Math.min(118, Math.round((base - period) / 16)));
      return periodForNote(ch, note);
    }
    let lo = 0;
    let hi = 95;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (periodForNote(ch, mid) > period) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    if (lo > 0) {
      const pHi = periodForNote(ch, lo);
      const pLo = periodForNote(ch, lo - 1);
      if (Math.abs(pLo - period) < Math.abs(pHi - period)) {
        return pLo;
      }
    }
    return periodForNote(ch, lo);
  }

  function eff_t1_3(ch: XMChannelState): void {
    // portamento
    if (ch.periodtarget !== undefined && ch.portaspeed !== undefined) {
      if (ch.period > ch.periodtarget) {
        ch.period = Math.max(ch.periodtarget, ch.period - ch.portaspeed);
      } else {
        ch.period = Math.min(ch.periodtarget, ch.period + ch.portaspeed);
      }
      if (ch.glissando) {
        ch.periodoffset =
          (ch.periodoffset ?? 0) +
          (nearestSemitonePeriod(ch, ch.period) - ch.period);
      }
    }
  }

  function eff_t0_4(ch: XMChannelState, data: number): void {
    // vibrato
    if (data & 0x0f) {
      ch.vibratodepth = (data & 0x0f) * 2;
    }
    if (data >> 4) {
      ch.vibratospeed = data >> 4;
    }
    eff_t1_4(ch);
  }

  function eff_t1_4(ch: XMChannelState): void {
    // vibrato
    ch.periodoffset =
      getVibratoDelta(ch.vibratotype, ch.vibratopos) * ch.vibratodepth;
    if (isNaN(ch.periodoffset)) {
      ch.periodoffset = 0;
    }
    // only updates on non-first ticks
    if (player.cur_tick > 0) {
      ch.vibratopos += ch.vibratospeed;
      ch.vibratopos &= 63;
    }
  }

  function getVibratoDelta(type: number, x: number): number {
    let delta = 0;
    switch (type & 0x03) {
      case 1: // sawtooth (ramp-down)
        delta = ((1 + (x * 2) / 64) % 2) - 1;
        break;
      case 2: // square
      case 3: // random (in FT2 these two are the same)
        delta = x < 32 ? 1 : -1;
        break;
      case 0:
      default: // sine
        delta = Math.sin((x * Math.PI) / 32);
        break;
    }
    return delta;
  }

  function eff_t1_5(ch: XMChannelState): void {
    // portamento + volume slide
    eff_t1_a(ch);
    eff_t1_3(ch);
  }

  function eff_t1_6(ch: XMChannelState): void {
    // vibrato + volume slide
    eff_t1_a(ch);
    eff_t1_4(ch);
  }

  function eff_t0_7(ch: XMChannelState, data: number): void {
    // tremolo
    if (data & 0x0f) {
      ch.tremolodepth = (data & 0x0f) * 4;
    }
    if (data >> 4) {
      ch.tremolospeed = data >> 4;
    }
    eff_t1_7(ch);
  }

  function eff_t1_7(ch: XMChannelState): void {
    // tremolo
    let offset =
      getVibratoDelta(ch.tremolotype ?? 0, ch.tremolopos ?? 0) *
      (ch.tremolodepth ?? 0);
    if (isNaN(offset)) {
      offset = 0;
    }
    ch.voloffset = (ch.voloffset ?? 0) + offset;
    if (player.cur_tick > 0) {
      ch.tremolopos = ((ch.tremolopos ?? 0) + (ch.tremolospeed ?? 0)) & 63;
    }
  }

  function getAutoVibratoDelta(type: number, pos: number): number {
    switch (type & 0x03) {
      case 1: // square
        return pos < 128 ? 1 : -1;
      case 2: // ramp down
        return 1 - (pos * 2) / 256;
      case 3: // ramp up
        return (pos * 2) / 256 - 1;
      case 0:
      default: // sine
        return Math.sin((pos * Math.PI) / 128);
    }
  }

  function eff_t0_8(ch: XMChannelState, data: number): void {
    // set panning
    ch.pan = data;
  }

  function eff_t0_9(ch: XMChannelState, data: number): void {
    // sample offset (with parameter memory)
    if (data !== 0) {
      ch.sampleoffset = data;
    } else if (ch.sampleoffset !== undefined) {
      data = ch.sampleoffset;
    }
    ch.off = data * 256;
  }

  function eff_t0_a(ch: XMChannelState, data: number): void {
    // volume slide
    if (data) {
      ch.volumeslide = -(data & 0x0f) + (data >> 4);
    }
  }

  function eff_t1_a(ch: XMChannelState): void {
    // volume slide
    if (ch.volumeslide !== undefined) {
      ch.vol = Math.max(0, Math.min(64, ch.vol + ch.volumeslide));
    }
  }

  function eff_t0_b(_ch: XMChannelState, data: number): void {
    // song jump
    const songpats = player.xm.songpats || [];
    if (data < songpats.length) {
      player.cur_songpos = data - 1;
      player.cur_pat = -1;
      player.cur_row = -1;
    }
  }

  function eff_t0_c(ch: XMChannelState, data: number): void {
    // set volume
    ch.vol = Math.min(64, data);
  }

  function eff_t0_d(_ch: XMChannelState, data: number): void {
    // pattern jump
    player.cur_songpos++;
    const songpats = player.xm.songpats || [];
    if (player.cur_songpos >= songpats.length) {
      player.cur_songpos = player.xm.song_looppos ?? 0;
      if (player.onEnded) {
        setTimeout(() => {
          if (player.onEnded) player.onEnded();
        }, 0);
      }
    }
    setCurrentPattern();
    player.next_row = (data >> 4) * 10 + (data & 0x0f);
  }

  function eff_t0_e(ch: XMChannelState, data: number): void {
    // extended effects!
    const eff = data >> 4;
    data = data & 0x0f;
    switch (eff) {
      case 1: // fine porta up (with memory)
        if (data === 0 && ch.fineportaup !== undefined) data = ch.fineportaup;
        ch.period = Math.max(1, ch.period - data);
        ch.fineportaup = data;
        break;
      case 2: // fine porta down (with memory)
        if (data === 0 && ch.fineportadown !== undefined)
          data = ch.fineportadown;
        ch.period += data;
        ch.fineportadown = data;
        break;
      case 3: // glissando control
        ch.glissando = data !== 0;
        break;
      case 4: // set vibrato waveform
        ch.vibratotype = data & 0x07;
        break;
      case 5: // finetune
        ch.fine = (data << 4) + data - 128;
        break;
      case 6: // pattern loop
        if (data == 0) {
          ch.loopstart = player.cur_row;
        } else {
          if (typeof ch.loopend === 'undefined') {
            ch.loopend = player.cur_row;
            ch.loopremaining = data;
          }
          if (ch.loopremaining !== undefined && ch.loopremaining !== 0) {
            ch.loopremaining--;
            player.next_row = ch.loopstart || 0;
          } else {
            delete ch.loopend;
            delete ch.loopstart;
          }
        }
        break;
      case 7: // set tremolo waveform
        ch.tremolotype = data & 0x07;
        break;
      case 8: // panning
        ch.pan = data * 0x11;
        break;
      case 0x0a: // fine vol slide up (with memory)
        if (data === 0 && ch.finevolup !== undefined) data = ch.finevolup;
        ch.vol = Math.min(64, ch.vol + data);
        ch.finevolup = data;
        break;
      case 0x0b: // fine vol slide down
        if (data === 0 && ch.finevoldown !== undefined) data = ch.finevoldown;
        ch.vol = Math.max(0, ch.vol - data);
        ch.finevoldown = data;
        break;
      case 0x0c: // note cut (EC0 cuts on tick 0; ECx > 0 handled in eff_t1_e)
        if (data === 0) ch.vol = 0;
        break;
      case 0x0d: // note delay
        ch.notedelaytick = data;
        break;
      case 0x0e: // pattern delay
        player.pattern_delay = data;
        break;
      default:
        break;
    }
  }

  function eff_t1_e(ch: XMChannelState): void {
    if (ch.effectdata !== undefined) {
      switch (ch.effectdata >> 4) {
        case 0x09: {
          const interval = ch.effectdata & 0x0f;
          if (interval !== 0 && player.cur_tick % interval === 0) {
            ch.off = 0;
          }
          break;
        }
        case 0x0c:
          if (player.cur_tick == (ch.effectdata & 0x0f)) {
            ch.vol = 0;
          }
          break;
        case 0x0d:
          if (
            ch.notedelaytick !== undefined &&
            player.cur_tick === ch.notedelaytick &&
            ch.delayednote
          ) {
            triggerRowNote(ch, ...ch.delayednote);
            ch.delayednote = undefined;
            ch.notedelaytick = undefined;
          }
          break;
      }
    }
  }

  function eff_t0_f(_ch: XMChannelState, data: number): void {
    // set tempo (F00 stops the song)
    if (data === 0) {
      stop();
      if (player.onEnded) {
        setTimeout(() => {
          if (player.onEnded) player.onEnded();
        }, 0);
      }
      return;
    } else if (data < 0x20) {
      player.xm.tempo = data;
    } else {
      player.xm.bpm = data;
    }
  }

  function eff_t0_g(_ch: XMChannelState, data: number): void {
    // set global volume
    if (data <= 0x40) {
      // volume gets multiplied by 2 to match
      // the initial max global volume of 128
      player.xm.global_volume = Math.max(0, data * 2);
    } else {
      player.xm.global_volume = player.max_global_volume;
    }
  }

  function eff_t0_h(_ch: XMChannelState, data: number): void {
    // global volume slide
    if (data) {
      // same as Axy but multiplied by 2
      player.xm.global_volumeslide = (-(data & 0x0f) + (data >> 4)) * 2;
    }
  }

  function eff_t1_h(): void {
    // global volume slide
    if (player.xm.global_volumeslide !== undefined) {
      player.xm.global_volume = Math.max(
        0,
        Math.min(
          player.max_global_volume,
          (player.xm.global_volume ?? player.max_global_volume) +
            player.xm.global_volumeslide
        )
      );
    }
  }

  function applyRetrigVolume(ch: XMChannelState): void {
    // retrigger volume table
    switch (ch.retrig >> 4) {
      case 1:
        ch.vol -= 1;
        break;
      case 2:
        ch.vol -= 2;
        break;
      case 3:
        ch.vol -= 4;
        break;
      case 4:
        ch.vol -= 8;
        break;
      case 5:
        ch.vol -= 16;
        break;
      case 6:
        ch.vol *= 2;
        ch.vol /= 3;
        break;
      case 7:
        ch.vol /= 2;
        break;
      case 9:
        ch.vol += 1;
        break;
      case 0x0a:
        ch.vol += 2;
        break;
      case 0x0b:
        ch.vol += 4;
        break;
      case 0x0c:
        ch.vol += 8;
        break;
      case 0x0d:
        ch.vol += 16;
        break;
      case 0x0e:
        ch.vol *= 3;
        ch.vol /= 2;
        break;
      case 0x0f:
        ch.vol *= 2;
        break;
    }
    ch.vol = Math.min(64, Math.max(0, ch.vol));
  }

  function eff_t0_r(ch: XMChannelState, data: number): void {
    // retrigger
    if (data & 0x0f) ch.retrig = (ch.retrig & 0xf0) + (data & 0x0f);
    if (data & 0xf0) ch.retrig = (ch.retrig & 0x0f) + (data & 0xf0);
    applyRetrigVolume(ch);
  }

  function eff_t1_r(ch: XMChannelState): void {
    const interval = ch.retrig & 0x0f;
    if (interval !== 0 && player.cur_tick % interval === 0) {
      ch.off = 0;
      applyRetrigVolume(ch);
    }
  }

  function eff_t0_t(ch: XMChannelState, data: number): void {
    // tremor
    if (data !== 0) {
      ch.tremorparam = data;
    }
  }

  function eff_t1_t(ch: XMChannelState): void {
    // tremor
    const param = ch.tremorparam ?? 0;
    const onTime = (param >> 4) + 1;
    const offTime = (param & 0x0f) + 1;
    const cycle = onTime + offTime;
    const pos = (ch.tremorpos ?? 0) % cycle;
    if (pos >= onTime) {
      ch.voloffset = -64;
    }
    ch.tremorpos = (pos + 1) % cycle;
  }

  function eff_t0_x(ch: XMChannelState, data: number): void {
    // extra-fine portamento up/down
    const sub = data >> 4;
    let val = data & 0x0f;
    if (sub === 1) {
      if (val === 0 && ch.xfineportaup !== undefined) val = ch.xfineportaup;
      ch.xfineportaup = val;
      ch.period = Math.max(1, ch.period - val * 0.25);
    } else if (sub === 2) {
      if (val === 0 && ch.xfineportadown !== undefined) val = ch.xfineportadown;
      ch.xfineportadown = val;
      const maxPeriod = (player.xm.flags ?? 0) & 1 ? 1920 : 6848;
      ch.period = Math.min(maxPeriod, ch.period + val * 0.25);
    }
  }

  function eff_t0_k(ch: XMChannelState, data: number): void {
    if (data === 0) {
      ch.release = 1;
      ch.keyofftick = undefined;
    } else {
      ch.keyofftick = data;
    }
  }

  function eff_t1_k(ch: XMChannelState): void {
    if (ch.keyofftick !== undefined && player.cur_tick === ch.keyofftick) {
      ch.release = 1;
      ch.keyofftick = undefined;
    }
  }

  function eff_t0_l(ch: XMChannelState, data: number): void {
    // set envelope position
    if (ch.env_vol) ch.env_vol.tick = data;
    if (ch.env_pan) ch.env_pan.tick = data;
  }

  function eff_t0_p(ch: XMChannelState, data: number): void {
    // panning slide
    if (data) {
      ch.panslide = (data >> 4) - (data & 0x0f);
    }
  }

  function eff_t1_p(ch: XMChannelState): void {
    // panning slide
    if (ch.panslide !== undefined) {
      ch.pan = Math.max(0, Math.min(255, ch.pan + ch.panslide));
    }
  }

  function eff_unimplemented(): void {}
  function eff_unimplemented_t0(): void {}

  function prettify_note(note: number): string {
    if (note < 0) return '---';
    if (note == 96) return '^^^';
    return _note_names[note % 12] + ~~(note / 12);
  }

  function prettify_effect(t: number, p: number): string {
    const tStr = t >= 10 ? String.fromCharCode(55 + t) : t.toString();
    const pStr = p < 16 ? '0' + p.toString(16) : p.toString(16);
    return tStr + pStr;
  }

  function getstring(dv: DataView, offset: number, len: number): string {
    const str: string[] = [];
    for (let i = offset; i < offset + len; i++) {
      const c = dv.getUint8(i);
      if (c === 0) break;
      str.push(decodeCp437Byte(c));
    }
    return str.join('');
  }

  // Return 2-pole Butterworth lowpass filter coefficients for
  // center frequency f_c (relative to sampling frequency)
  function filterCoeffs(f_c: number): [number, number, number] {
    if (f_c > 0.5) {
      // we can't lowpass above the nyquist frequency...
      f_c = 0.5;
    }
    const wct = Math.sqrt(2) * Math.PI * f_c;
    const e = Math.exp(-wct);
    const c = e * Math.cos(wct);
    const gain = (1 - 2 * c + e * e) / 2;
    return [gain, 2 * c, -e * e];
  }

  function updateChannelPeriod(ch: XMChannelState, period: number): void {
    let freq: number;
    if ((player.xm.flags ?? 0) & 1) {
      // Linear frequency table
      freq = 8363 * Math.pow(2, (1152.0 - period) / 192.0);
    } else {
      // Amiga frequency table
      // In FT2: Frequency = 8363 * 1712 / period (where 1712 is C-4 period)
      // Since periods in jsxm are scaled by 1/4: (8363 * 1712) / (period * 4) = (8363 * 428) / period
      freq = period > 0 ? (8363.0 * 428.0) / period : 0;
    }
    if (isNaN(freq) || freq <= 0) {
      return;
    }
    ch.doff = freq / f_smp;
    ch.filter = filterCoeffs(ch.doff / 2);
  }

  function periodForNote(ch: XMChannelState, note: number): number {
    // channel was silenced (e.g. by a seek) and has no sample yet
    if (!ch.samp) return ch.period;

    if ((player.xm.flags ?? 0) & 1) {
      // Linear frequency table
      return 1920 - (note + ch.samp.note) * 16 - (ch.fine || 0) / 8.0;
    } else {
      // Amiga frequency table
      // In FT2: RealNote = PatternNote + RelativeTone (1 = C-0, 49 = C-4)
      // note in jsxm is 0-indexed (0 = C-0, 48 = C-4)
      const realNote = Math.max(
        1,
        Math.min(118, note + 1 + (ch.samp.note || 0))
      );
      const octave = Math.floor((realNote - 1) / 12);
      const noteMod = realNote % 12; // 1 for C (idx 8), 12 (0) for B (idx 0)
      const fineTune = ch.fine || 0; // -128..+127
      const finePos = noteMod * 8 + fineTune / 16.0;
      const pIdx0 = Math.max(0, Math.min(95, Math.floor(finePos)));
      const pIdx1 = Math.min(95, pIdx0 + 1);
      const frac = finePos - Math.floor(finePos);
      const p0 = AMIGA_PERIOD_TAB[pIdx0]!;
      const p1 =
        pIdx1 < 96 ? AMIGA_PERIOD_TAB[pIdx1]! : AMIGA_PERIOD_TAB[0]! / 2;
      const tabVal = p0 * (1 - frac) + p1 * frac;
      const ft2Period = (tabVal * 32.0) / Math.pow(2, octave);
      return ft2Period / 4.0;
    }
  }

  function setCurrentPattern(): void {
    const songpats = player.xm.songpats || [];
    const patterns = player.xm.patterns || [];
    let nextPat = songpats[player.cur_songpos] ?? 0;

    // check for out of range pattern index
    while (nextPat >= patterns.length) {
      if (player.cur_songpos + 1 < songpats.length) {
        // first try skipping the position
        player.cur_songpos++;
      } else if (
        (player.cur_songpos === player.xm.song_looppos &&
          player.cur_songpos !== 0) ||
        (player.xm.song_looppos ?? 0) >= songpats.length
      ) {
        // if we allready tried song_looppos or if song_looppos
        // is out of range, go to the first position
        player.cur_songpos = 0;
      } else {
        // try going to song_looppos
        player.cur_songpos = player.xm.song_looppos ?? 0;
      }

      nextPat = songpats[player.cur_songpos] ?? 0;
    }

    player.cur_pat = nextPat;
  }

  function triggerRowNote(
    ch: XMChannelState,
    note: number,
    instIdx: number,
    vol: number,
    efftype: number,
    effparam: number
  ): void {
    void effparam;
    const instruments = player.xm.instruments || [];
    let inst = ch.inst;
    let triggernote = false;
    // instrument trigger
    if (instIdx != -1) {
      inst = instruments[instIdx - 1];
      if (inst && inst.samplemap && inst.samples) {
        ch.inst = inst;
        // retrigger unless overridden below
        triggernote = true;
        if (ch.note !== undefined && inst.samplemap) {
          ch.samp = inst.samples[inst.samplemap[ch.note]];
          if (ch.samp) {
            ch.vol = ch.samp.vol;
            ch.pan = ch.samp.pan;
            ch.fine = ch.samp.fine;
          } else {
            ch.samp = undefined;
          }
        } else {
          ch.samp = undefined;
        }
      }
    }

    // note trigger
    if (note != -1) {
      if (note == 96) {
        ch.release = 1;
        triggernote = false;
      } else {
        if (inst && inst.samplemap && inst.samples) {
          ch.note = note;
          ch.samp = inst.samples[inst.samplemap[ch.note]];
          if (ch.samp) {
            if (triggernote) {
              // if we were already triggering the note, reset vol/pan using
              // (potentially) new sample
              ch.pan = ch.samp.pan;
              ch.vol = ch.samp.vol;
              ch.fine = ch.samp.fine;
            }
          } else {
            ch.samp = undefined;
          }
          triggernote = true;
        }
      }
    }

    ch.voleffectfn = undefined;
    if (vol != -1) {
      // volume column
      const v = vol;
      ch.voleffectdata = v & 0x0f;
      if (v >= 0x10 && v <= 0x50) {
        ch.vol = v - 0x10;
      } else if (v >= 0x60 && v < 0x70) {
        // volume slide down
        ch.voleffectfn = function (ch: XMChannelState): void {
          ch.vol = Math.max(0, ch.vol - (ch.voleffectdata ?? 0));
        };
      } else if (v >= 0x70 && v < 0x80) {
        // volume slide up
        ch.voleffectfn = function (ch: XMChannelState): void {
          ch.vol = Math.min(64, ch.vol + (ch.voleffectdata ?? 0));
        };
      } else if (v >= 0x80 && v < 0x90) {
        // fine volume slide down
        ch.vol = Math.max(0, ch.vol - (v & 0x0f));
      } else if (v >= 0x90 && v < 0xa0) {
        // fine volume slide up
        ch.vol = Math.min(64, ch.vol + (v & 0x0f));
      } else if (v >= 0xa0 && v < 0xb0) {
        // vibrato speed
        ch.vibratospeed = v & 0x0f;
      } else if (v >= 0xb0 && v < 0xc0) {
        // vibrato w/ depth
        ch.vibratodepth = v & 0x0f;
        ch.voleffectfn = player.effects_t1[4] ?? undefined; // use vibrato effect directly
        const eff4 = player.effects_t1[4];
        if (eff4) eff4(ch); // and also call it on tick 0
      } else if (v >= 0xc0 && v < 0xd0) {
        // set panning
        ch.pan = (v & 0x0f) * 0x11;
      } else if (v >= 0xd0 && v < 0xe0) {
        // panning slide left
        ch.voleffectfn = function (ch: XMChannelState): void {
          ch.pan = Math.max(0, ch.pan - (ch.voleffectdata ?? 0));
        };
      } else if (v >= 0xe0 && v < 0xf0) {
        // panning slide right
        ch.voleffectfn = function (ch: XMChannelState): void {
          ch.pan = Math.min(255, ch.pan + (ch.voleffectdata ?? 0));
        };
      } else if (v >= 0xf0 && v <= 0xff) {
        // portamento
        if (v & 0x0f) {
          ch.portaspeed = (v & 0x0f) << 4;
        }
        ch.voleffectfn = player.effects_t1[3] ?? undefined; // just run 3x0
      }
    }

    // special handling for portamentos: don't trigger the note
    if (efftype == 3 || efftype == 5 || vol >= 0xf0) {
      if (note != -1 && ch.note !== undefined) {
        ch.periodtarget = periodForNote(ch, ch.note);
      }
      triggernote = false;
      if (inst && inst.samplemap) {
        if (ch.env_vol == undefined) {
          // note wasn't already playing; we basically have to ignore the
          // portamento and just trigger
          triggernote = true;
        } else if (ch.release) {
          // reset envelopes if note was released but leave offset/pitch/etc
          // alone
          ch.envtick = 0;
          ch.release = 0;
          ch.fadeout = 65536;
          if (inst.env_vol) ch.env_vol = new EnvelopeFollower(inst.env_vol);
          if (inst.env_pan) ch.env_pan = new EnvelopeFollower(inst.env_pan);
        }
      }
    }

    if (triggernote) {
      // there's gotta be a less hacky way to handle offset commands...
      if (efftype != 9) ch.off = 0;
      ch.release = 0;
      ch.fadeout = 65536;
      ch.envtick = 0;
      ch.tremorpos = 0;
      ch.autovib_pos = 0;
      ch.autovib_sweep = 0;
      if (inst && inst.env_vol) ch.env_vol = new EnvelopeFollower(inst.env_vol);
      if (inst && inst.env_pan) ch.env_pan = new EnvelopeFollower(inst.env_pan);
      if (ch.note !== undefined) {
        ch.period = periodForNote(ch, ch.note);
      }
      // Micro-declick (8 samples ~0.18ms) only when retriggering an already-playing voice
      if (ch.inst && (ch.vL > 0.05 || ch.vR > 0.05)) {
        ch.ramp = 0.0;
      } else {
        ch.ramp = 1.0;
      }
      // waveforms 0-3 are retriggered on new notes while 4-7 are continuous
      if (ch.vibratotype < 4) {
        ch.vibratopos = 0;
      }
      if ((ch.tremolotype ?? 0) < 4) {
        ch.tremolopos = 0;
      }
    }
  }

  function nextRow(): void {
    if (typeof player.next_row === 'undefined') {
      player.next_row = player.cur_row + 1;
    }
    player.cur_row = player.next_row;
    player.next_row++;

    const patterns = player.xm.patterns || [];
    const curPattern = patterns[player.cur_pat];
    const songpats = player.xm.songpats || [];
    if (
      player.cur_pat == -1 ||
      !curPattern ||
      player.cur_row >= curPattern.length
    ) {
      player.cur_row = 0;
      player.next_row = 1;
      player.cur_songpos++;
      if (player.cur_songpos >= songpats.length) {
        player.cur_songpos = player.xm.song_looppos ?? 0;
        if (player.onEnded) {
          setTimeout(() => {
            if (player.onEnded) player.onEnded();
          }, 0);
        }
      }
      setCurrentPattern();
    }
    const p = patterns[player.cur_pat];
    if (!p) return;
    const r = p[player.cur_row];
    if (!r) return;
    const channelinfo = player.xm.channelinfo || [];
    for (let i = 0; i < r.length; i++) {
      const ch = channelinfo[i];
      if (!ch) continue;
      ch.keyofftick = undefined;
      ch.delayednote = undefined;
      ch.notedelaytick = undefined;

      const [note, inst, vol, efftype, effparam] = r[i];
      const isDelayed =
        efftype === 0x0e && effparam >> 4 === 0x0d && (effparam & 0x0f) > 0;

      if (isDelayed) {
        ch.delayednote = r[i];
      } else {
        triggerRowNote(ch, note, inst, vol, efftype, effparam);
      }

      ch.effect = efftype;
      ch.effectdata = effparam;
      if (ch.effect < 36) {
        ch.effectfn = player.effects_t1[ch.effect];
        const eff_t0 = player.effects_t0[ch.effect];
        if (eff_t0) {
          eff_t0(ch, ch.effectdata);
        }
      }
    }
  }

  function nextTick(): void {
    player.cur_tick++;
    const nchan = player.xm.nchan ?? 0;
    const channelinfo = player.xm.channelinfo ?? [];
    let j: number;
    let ch: XMChannelState;
    for (j = 0; j < nchan; j++) {
      ch = channelinfo[j];
      if (ch) {
        ch.periodoffset = 0;
        ch.voloffset = 0;
      }
    }
    if (player.cur_tick >= (player.xm.tempo ?? 6)) {
      player.cur_tick = 0;
      if (player.pattern_delay > 0) {
        player.pattern_delay--;
      } else {
        nextRow();
      }
    }
    for (j = 0; j < nchan; j++) {
      ch = channelinfo[j];
      if (!ch) continue;
      if (player.cur_tick !== 0) {
        if (ch.voleffectfn) ch.voleffectfn(ch);
        if (ch.effectfn) ch.effectfn(ch);
      }
      const inst = ch.inst;
      if (inst === undefined) continue;
      if (ch.env_vol === undefined || ch.env_pan === undefined) continue;
      ch.volE = ch.env_vol.Tick(ch.release ?? 0);
      ch.panE = ch.env_pan.Tick(ch.release ?? 0);
      if (
        ch.release &&
        inst.env_vol &&
        inst.env_vol.type & 1 &&
        inst.vol_fadeout
      ) {
        ch.fadeout = Math.max(0, (ch.fadeout ?? 65536) - inst.vol_fadeout);
      }
      if (inst.vib_depth && inst.vib_rate) {
        const sweep = inst.vib_sweep ?? 0;
        const sweepProgress =
          sweep > 0 ? Math.min(1, (ch.autovib_sweep ?? 0) / sweep) : 1;
        const vibDelta =
          getAutoVibratoDelta(inst.vib_type ?? 0, ch.autovib_pos ?? 0) *
          inst.vib_depth *
          sweepProgress;
        ch.periodoffset = (ch.periodoffset ?? 0) + vibDelta;
        ch.autovib_pos = ((ch.autovib_pos ?? 0) + inst.vib_rate) & 255;
        if (sweep > 0 && (ch.autovib_sweep ?? 0) < sweep) {
          ch.autovib_sweep = (ch.autovib_sweep ?? 0) + 1;
        }
      }
      updateChannelPeriod(ch, ch.period + (ch.periodoffset ?? 0));
    }
  }

  // This function gradually brings the channel back down to zero if it isn't
  // already to avoid clicks and pops when samples end.
  function MixSilenceIntoBuf(
    ch: XMChannelState,
    start: number,
    end: number,
    dataL: Float32Array,
    dataR: Float32Array
  ): number {
    let s = ch.filterstate[1];
    if (isNaN(s)) {
      return 0;
    }
    for (let i = start; i < end; i++) {
      if (Math.abs(s) < 1.526e-5) {
        // == 1/65536.0
        s = 0;
        ch.vL = 0;
        ch.vR = 0;
        break;
      }
      dataL[i] += s * ch.vL;
      dataR[i] += s * ch.vR;
      s *= popfilter_alpha;
      ch.vL *= popfilter_alpha;
      ch.vR *= popfilter_alpha;
    }
    ch.filterstate[1] = s;
    ch.filterstate[2] = s;
    return 0;
  }

  function MixChannelIntoBuf(
    ch: XMChannelState,
    start: number,
    end: number,
    dataL: Float32Array,
    dataR: Float32Array
  ): number {
    const inst = ch.inst;
    const instsamp = ch.samp;
    let loop = false;
    let looplen = 0;
    let loopstart = 0;

    // nothing on this channel, just filter the last dc offset back down to zero
    if (instsamp == undefined || inst == undefined || ch.mute) {
      return MixSilenceIntoBuf(ch, start, end, dataL, dataR);
    }

    const samp = instsamp.sampledata;
    let sample_end = instsamp.len;
    if ((instsamp.type & 3) == 1 && instsamp.looplen > 0) {
      loop = true;
      loopstart = instsamp.loop;
      looplen = instsamp.looplen;
      sample_end = loopstart + looplen;
    }
    const fadeoutScale = (ch.fadeout ?? 65536) / 65536.0;
    const volE = (ch.volE / 64.0) * fadeoutScale; // current volume envelope
    const panE = 4 * (ch.panE - 32); // current panning envelope
    const p = panE + ch.pan - 128; // final pan
    const global_vol = player.xm.global_volume ?? player.max_global_volume;
    const effVol = Math.max(0, Math.min(64, ch.vol + (ch.voloffset ?? 0)));
    let volL = (global_vol * volE * (128 - p) * effVol) / (64 * 128 * 128);
    let volR = (global_vol * volE * (128 + p) * effVol) / (64 * 128 * 128);
    if (volL < 0) volL = 0;
    if (volR < 0) volR = 0;
    if (volR === 0 && volL === 0) return 0;
    if (isNaN(volR) || isNaN(volL)) {
      return 0;
    }
    let k = ch.off ?? 0;
    const dk = ch.doff ?? 0;
    let Vrms = 0;
    const filter = ch.filter ?? [1, 0, 0];
    const f0 = filter[0],
      f1 = filter[1],
      f2 = filter[2];
    let fs0 = ch.filterstate[0],
      fs1 = ch.filterstate[1],
      fs2 = ch.filterstate[2];

    // we also low-pass filter volume changes with a simple one-zero,
    // one-pole filter to avoid pops and clicks when volume changes.
    let vL =
      popfilter_alpha * ch.vL +
      (1 - popfilter_alpha) * (volL + ch.vLprev) * 0.5;
    let vR =
      popfilter_alpha * ch.vR +
      (1 - popfilter_alpha) * (volR + ch.vRprev) * 0.5;
    const pf_8 = Math.pow(popfilter_alpha, 8);
    ch.vLprev = volL;
    ch.vRprev = volR;

    let ramp = ch.ramp ?? 1.0;
    const rampStep = 1.0 / 8.0;

    // we can mix up to this many bytes before running into a sample end/loop
    let i = start;
    let failsafe = 100;
    let s = 0;
    let y = 0;
    while (i < end) {
      if (failsafe-- === 0) {
        break;
      }
      if (k >= sample_end) {
        if (loop) {
          k = loopstart + ((k - loopstart) % looplen);
        } else {
          // kill sample
          ch.inst = undefined;
          // fill rest of buf with filtered dc offset using loop above
          return Vrms + MixSilenceIntoBuf(ch, i, end, dataL, dataR);
        }
      }
      const next_event = Math.max(1, Math.min(end, i + (sample_end - k) / dk));
      // this is the inner loop of the player

      // unrolled 8x
      for (; i + 7 < next_event; i += 8) {
        if (ramp < 1.0) {
          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i] += vL * y;
          dataR[i] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 1] += vL * y;
          dataR[i + 1] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 2] += vL * y;
          dataR[i + 2] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 3] += vL * y;
          dataR[i + 3] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 4] += vL * y;
          dataR[i + 4] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 5] += vL * y;
          dataR[i + 5] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 6] += vL * y;
          dataR[i + 6] += vR * y;
          Vrms += (vL + vR) * y * y;

          s = samp[k | 0];
          y = (f0 * (s + fs0) + f1 * fs1 + f2 * fs2) * ramp;
          ramp = Math.min(1.0, ramp + rampStep);
          fs2 = fs1;
          fs1 = y;
          fs0 = s;
          k += dk;
          dataL[i + 7] += vL * y;
          dataR[i + 7] += vR * y;
          Vrms += (vL + vR) * y * y;

          vL = pf_8 * vL + (1 - pf_8) * volL;
          vR = pf_8 * vR + (1 - pf_8) * volR;
          continue;
        }

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i] += vL * y;
        dataR[i] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 1] += vL * y;
        dataR[i + 1] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 2] += vL * y;
        dataR[i + 2] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 3] += vL * y;
        dataR[i + 3] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 4] += vL * y;
        dataR[i + 4] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 5] += vL * y;
        dataR[i + 5] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 6] += vL * y;
        dataR[i + 6] += vR * y;
        Vrms += (vL + vR) * y * y;

        s = samp[k | 0];
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        k += dk;
        dataL[i + 7] += vL * y;
        dataR[i + 7] += vR * y;
        Vrms += (vL + vR) * y * y;

        vL = pf_8 * vL + (1 - pf_8) * volL;
        vR = pf_8 * vR + (1 - pf_8) * volR;
      }

      for (; i < next_event; i++) {
        s = samp[k | 0];
        // we low-pass filter here since we are resampling some arbitrary
        // frequency to f_smp; this is an anti-aliasing filter and is
        // implemented as an IIR butterworth filter (usually we'd use an FIR
        // brick wall filter, but this is much simpler computationally and
        // sounds fine)
        y = f0 * (s + fs0) + f1 * fs1 + f2 * fs2;
        if (ramp < 1.0) {
          y *= ramp;
          ramp = Math.min(1.0, ramp + rampStep);
        }
        fs2 = fs1;
        fs1 = y;
        fs0 = s;
        dataL[i] += vL * y;
        dataR[i] += vR * y;
        Vrms += (vL + vR) * y * y;
        k += dk;
      }
    }
    ch.off = k;
    ch.filterstate[0] = fs0;
    ch.filterstate[1] = fs1;
    ch.filterstate[2] = fs2;
    ch.vL = vL;
    ch.vR = vR;
    ch.ramp = ramp;
    return Vrms * 0.5;
  }

  // Buffers handed to the scope listener are reused across ticks and only
  // reallocated when the channel count or scope width changes.
  let vuBuf = new Float32Array(0);
  let vuAcc = new Float32Array(0);
  let vuSamples = 0;
  let scopeBufs: Float32Array[] = [];
  let scopeBufsWidth = -1;
  const scopeEvent: XMScopeFrame = {
    t: 0,
    vu: vuBuf,
    scopes: undefined,
    songpos: 0,
    pat: 0,
    row: 0
  };

  function renderAudio(
    dataL: Float32Array,
    dataR: Float32Array,
    sampleRate = 44100,
    playbackTime = 0
  ): void {
    f_smp = sampleRate;
    let buflen = dataL.length;

    for (let i = 0; i < buflen; i++) {
      dataL[i] = 0;
      dataR[i] = 0;
    }

    let offset = 0;
    const scopewidth = XMView.scope_width;

    while (buflen > 0) {
      const ticklen = 0 | ((f_smp * 2.5) / (player.xm.bpm || 125));
      if (player.cur_pat == -1 || player.cur_ticksamp >= ticklen) {
        nextTick();
        if (!player.playing) break;
        player.cur_ticksamp -= ticklen;
        vuSamples = 0;
        if (vuAcc.length > 0) vuAcc.fill(0);
      }
      const currentTicklen = 0 | ((f_smp * 2.5) / (player.xm.bpm || 125));
      const tickduration = Math.max(
        0,
        Math.min(buflen, currentTicklen - player.cur_ticksamp)
      );
      const nchan = player.xm.nchan ?? 0;
      if (vuBuf.length !== nchan) {
        vuBuf = new Float32Array(nchan);
        vuAcc = new Float32Array(nchan);
      }
      if (
        scopewidth > 0 &&
        (scopeBufsWidth !== scopewidth || scopeBufs.length !== nchan)
      ) {
        scopeBufs = [];
        for (let j = 0; j < nchan; j++)
          scopeBufs.push(new Float32Array(scopewidth));
        scopeBufsWidth = scopewidth;
      }

      const tickStart = player.cur_ticksamp;
      const tickEnd = tickStart + tickduration;
      const kStart = scopewidth > 0 ? Math.max(0, Math.ceil(tickStart / 4)) : 0;
      const kEnd =
        scopewidth > 0 ? Math.min(scopewidth, Math.ceil(tickEnd / 4)) : 0;

      const channelinfo = player.xm.channelinfo || [];
      for (let j = 0; j < nchan; j++) {
        const ch = channelinfo[j];
        if (!ch) continue;
        const scope = scopewidth > 0 ? scopeBufs[j] : undefined;
        if (scope && kEnd > kStart) {
          for (let k = kStart; k < kEnd; k++) {
            const bufIdx = offset + (k * 4 - tickStart);
            scope[k] = -dataL[bufIdx] - dataR[bufIdx];
          }
        }

        vuAcc[j] += MixChannelIntoBuf(
          ch,
          offset,
          offset + tickduration,
          dataL,
          dataR
        );

        if (scope && kEnd > kStart) {
          for (let k = kStart; k < kEnd; k++) {
            const bufIdx = offset + (k * 4 - tickStart);
            scope[k] += dataL[bufIdx] + dataR[bufIdx];
          }
        }
      }

      vuSamples += tickduration;
      offset += tickduration;
      player.cur_ticksamp += tickduration;
      buflen -= tickduration;

      if (player.cur_ticksamp >= currentTicklen && XMView.pushEvent) {
        const invSamples = vuSamples > 0 ? 1 / vuSamples : 0;
        for (let j = 0; j < nchan; j++) {
          vuBuf[j] = vuAcc[j] * invSamples;
        }
        scopeEvent.t = playbackTime + offset / f_smp;
        scopeEvent.vu = vuBuf;
        scopeEvent.scopes = scopewidth > 0 && nchan > 0 ? scopeBufs : undefined;
        scopeEvent.songpos = player.cur_songpos;
        scopeEvent.pat = player.cur_pat;
        scopeEvent.row = player.cur_row;
        XMView.pushEvent(scopeEvent);
      }
    }
  }

  function ConvertSample(array: Uint8Array, bits: number): Float32Array {
    let len = array.length;
    let acc = 0;
    let samp: Float32Array;
    let b: number;
    let k: number;
    if (bits === 0) {
      // 8 bit sample
      samp = new Float32Array(len);
      for (k = 0; k < len; k++) {
        acc += array[k];
        b = acc & 255;
        if (b & 128) b = b - 256;
        samp[k] = b / 128.0;
      }
      return samp;
    } else {
      len /= 2;
      samp = new Float32Array(len);
      for (k = 0; k < len; k++) {
        b = array[k * 2] + (array[k * 2 + 1] << 8);
        if (b & 32768) b = b - 65536;
        acc = Math.max(-1, Math.min(1, acc + b / 32768.0));
        samp[k] = acc;
      }
      return samp;
    }
  }

  // optimization: unroll short sample loops so we can run our inner mixing loop
  // uninterrupted for as long as possible; this also handles pingpong loops.
  function UnrollSampleLoop(samp: XMSample): void {
    const nloopsBase = ((2048 + samp.looplen - 1) / samp.looplen) | 0;
    const pingpong = samp.type & 2;
    let nloops = nloopsBase;
    if (pingpong) {
      // make sure we have an even number of loops if we are pingponging
      nloops = (nloops + 1) & ~1;
    }
    const samplesiz = samp.loop + nloops * samp.looplen;
    const data = new Float32Array(samplesiz);
    let i = 0;
    for (; i < samp.loop; i++) {
      data[i] = samp.sampledata[i];
    }
    for (let j = 0; j < nloops; j++) {
      let k: number;
      if (j & 1 && pingpong) {
        for (k = samp.looplen - 1; k >= 0; k--) {
          data[i++] = samp.sampledata[samp.loop + k];
        }
      } else {
        for (k = 0; k < samp.looplen; k++) {
          data[i++] = samp.sampledata[samp.loop + k];
        }
      }
    }
    samp.sampledata = data;
    samp.looplen = nloops * samp.looplen;
    samp.type = 1;
  }

  function load(arrayBuf: ArrayBuffer): boolean {
    const dv = new DataView(arrayBuf);
    player.xm = {};

    player.xm.songname = getstring(dv, 17, 20);
    const hlen = dv.getUint32(0x3c, true) + 0x3c;
    const songlen = dv.getUint16(0x40, true);
    player.xm.song_looppos = dv.getUint16(0x42, true);
    player.xm.nchan = dv.getUint16(0x44, true);
    const npat = dv.getUint16(0x46, true);
    const ninst = dv.getUint16(0x48, true);
    player.xm.flags = dv.getUint16(0x4a, true);
    player.xm.tempo = dv.getUint16(0x4c, true);
    player.xm.bpm = dv.getUint16(0x4e, true);
    player.xm.initial_tempo = player.xm.tempo;
    player.xm.initial_bpm = player.xm.bpm;
    player.xm.channelinfo = [];
    player.xm.global_volume = player.max_global_volume;

    let i: number;
    let j: number;
    let k: number;

    for (i = 0; i < player.xm.nchan; i++) {
      player.xm.channelinfo.push({
        number: i,
        filterstate: new Float32Array(3),
        vol: 0,
        pan: 128,
        period: 1920 - 48 * 16,
        vL: 0,
        vR: 0, // left right volume envelope followers (changes per sample)
        vLprev: 0,
        vRprev: 0,
        mute: 0,
        volE: 0,
        panE: 0,
        retrig: 0,
        vibratopos: 0,
        vibratodepth: 1,
        vibratospeed: 1,
        vibratotype: 0,
        tremolopos: 0,
        tremolodepth: 0,
        tremolospeed: 0,
        tremolotype: 0,
        fadeout: 65536
      });
    }

    player.xm.songpats = [];
    for (i = 0; i < songlen; i++) {
      player.xm.songpats.push(dv.getUint8(0x50 + i));
    }

    let idx = hlen;
    player.xm.patterns = [];
    for (i = 0; i < npat; i++) {
      const pattern: XMPattern = [];
      const patrows = dv.getUint16(idx + 5, true);
      const patsize = dv.getUint16(idx + 7, true);
      idx += 9;
      for (j = 0; patsize > 0 && j < patrows; j++) {
        const row: XMPatternRow = [];
        for (k = 0; k < player.xm.nchan; k++) {
          const byte0 = dv.getUint8(idx);
          idx++;
          let note = -1;
          let inst = -1;
          let vol = -1;
          let efftype = 0;
          let effparam = 0;
          if (byte0 & 0x80) {
            if (byte0 & 0x01) {
              note = dv.getUint8(idx) - 1;
              idx++;
            }
            if (byte0 & 0x02) {
              inst = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x04) {
              vol = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x08) {
              efftype = dv.getUint8(idx);
              idx++;
            }
            if (byte0 & 0x10) {
              effparam = dv.getUint8(idx);
              idx++;
            }
          } else {
            // byte0 is note from 1..96 or 0 for nothing or 97 for release
            // so we subtract 1 so that C-0 is stored as 0
            note = byte0 - 1;
            inst = dv.getUint8(idx);
            idx++;
            vol = dv.getUint8(idx);
            idx++;
            efftype = dv.getUint8(idx);
            idx++;
            effparam = dv.getUint8(idx);
            idx++;
          }
          const notedata: XMNoteData = [note, inst, vol, efftype, effparam];
          row.push(notedata);
        }
        pattern.push(row);
      }
      player.xm.patterns.push(pattern);
    }

    player.xm.instruments = [];
    // now load instruments
    for (i = 0; i < ninst; i++) {
      const hdrsiz = dv.getUint32(idx, true);
      const instname = getstring(dv, idx + 0x4, 22);
      const nsamp = dv.getUint16(idx + 0x1b, true);
      const inst: XMInstrument = {
        name: instname,
        number: i
      };
      if (nsamp > 0) {
        const samplemap = new Uint8Array(arrayBuf, idx + 33, 96);

        const env_nvol = dv.getUint8(idx + 225);
        const env_vol_type = dv.getUint8(idx + 233);
        let env_vol_sustain = dv.getUint8(idx + 227);
        const env_vol_loop_start = dv.getUint8(idx + 228);
        const env_vol_loop_end = dv.getUint8(idx + 229);
        const env_npan = dv.getUint8(idx + 226);
        const env_pan_type = dv.getUint8(idx + 234);
        let env_pan_sustain = dv.getUint8(idx + 230);
        const env_pan_loop_start = dv.getUint8(idx + 231);
        const env_pan_loop_end = dv.getUint8(idx + 232);
        const vib_type = dv.getUint8(idx + 235);
        const vib_sweep = dv.getUint8(idx + 236);
        const vib_depth = dv.getUint8(idx + 237);
        const vib_rate = dv.getUint8(idx + 238);
        const vol_fadeout = dv.getUint16(idx + 239, true);
        const env_vol: number[] = [];
        for (j = 0; j < env_nvol * 2; j++) {
          env_vol.push(dv.getUint16(idx + 129 + j * 2, true));
        }
        const env_pan: number[] = [];
        for (j = 0; j < env_npan * 2; j++) {
          env_pan.push(dv.getUint16(idx + 177 + j * 2, true));
        }
        const samphdrsiz = dv.getUint32(idx + 0x1d, true);
        idx += hdrsiz;
        let totalsamples = 0;
        const samps: XMSample[] = [];
        for (j = 0; j < nsamp; j++) {
          const samplen = dv.getUint32(idx, true);
          const samploop = dv.getUint32(idx + 4, true);
          const samplooplen = dv.getUint32(idx + 8, true);
          const sampvol = dv.getUint8(idx + 12);
          const sampfinetune = dv.getInt8(idx + 13);
          let samptype = dv.getUint8(idx + 14);
          const samppan = dv.getUint8(idx + 15);
          const sampnote = dv.getInt8(idx + 16);
          const sampname = getstring(dv, idx + 18, 22);
          const sampleoffset = totalsamples;
          if (samplooplen === 0) {
            samptype &= ~3;
          }
          const samp: XMSample = {
            sampname,
            len: samplen,
            loop: samploop,
            looplen: samplooplen,
            note: sampnote,
            fine: sampfinetune,
            pan: samppan,
            type: samptype,
            vol: sampvol,
            fileoffset: sampleoffset,
            sampledata: new Float32Array(0)
          };
          samps.push(samp);
          idx += samphdrsiz;
          totalsamples += samplen;
        }
        for (j = 0; j < nsamp; j++) {
          const samp = samps[j];
          samp.sampledata = ConvertSample(
            new Uint8Array(arrayBuf, idx + samp.fileoffset, samp.len),
            samp.type & 16
          );
          if (samp.type & 16) {
            samp.len /= 2;
            samp.loop /= 2;
            samp.looplen /= 2;
          }
          // unroll short loops and any pingpong loops
          if (samp.type & 3 && (samp.looplen < 2048 || samp.type & 2)) {
            UnrollSampleLoop(samp);
          }
        }
        idx += totalsamples;
        inst.samplemap = samplemap;
        inst.samples = samps;
        inst.vol_fadeout = vol_fadeout;
        inst.vib_type = vib_type;
        inst.vib_sweep = vib_sweep;
        inst.vib_depth = vib_depth;
        inst.vib_rate = vib_rate;
        if (env_vol_type & 1 && env_nvol > 0) {
          if (!(env_vol_type & 2)) {
            // if there's no sustain point, create one
            env_vol_sustain = env_vol.length / 2;
          }
          inst.env_vol = new Envelope(
            env_vol,
            env_vol_type,
            env_vol_sustain,
            env_vol_loop_start,
            env_vol_loop_end
          );
        } else {
          // no envelope, then just make a default full-volume envelope.
          // i thought this would use fadeout, but apparently it doesn't.
          inst.env_vol = new Envelope([0, 64, 1, 0], 2, 0, 0, 0);
        }
        if (env_pan_type & 1 && env_npan > 0) {
          if (!(env_pan_type & 2)) {
            // if there's no sustain point, create one
            env_pan_sustain = env_pan.length / 2;
          }
          inst.env_pan = new Envelope(
            env_pan,
            env_pan_type,
            env_pan_sustain,
            env_pan_loop_start,
            env_pan_loop_end
          );
        } else {
          // create a default empty envelope
          inst.env_pan = new Envelope([0, 32], 0, 0, 0, 0);
        }
      } else {
        idx += hdrsiz;
      }
      player.xm.instruments.push(inst);
    }

    return true;
  }

  function play(): void {
    player.playing = true;
  }

  function pause(): void {
    player.playing = false;
  }

  function stop(): void {
    player.playing = false;
    player.cur_pat = -1;
    player.cur_row = 64;
    player.cur_songpos = -1;
    player.cur_ticksamp = 0;
    player.pattern_delay = 0;
    vuSamples = 0;
    if (vuAcc.length > 0) vuAcc.fill(0);
    silenceChannels();
    player.xm.global_volume = player.max_global_volume;
    player.xm.tempo = player.xm.initial_tempo;
    player.xm.bpm = player.xm.initial_bpm;
  }

  // Cut every voice and clear per-channel effect state, so notes started
  // before a jump don't keep ringing (their note-offs are never reached).
  function silenceChannels(): void {
    const channels = player.xm.channelinfo || [];
    for (const ch of channels) {
      ch.inst = undefined;
      ch.samp = undefined;
      ch.note = undefined;
      ch.env_vol = undefined;
      ch.env_pan = undefined;
      ch.voleffectfn = undefined;
      ch.effectfn = undefined;
      ch.release = 0;
      ch.vol = 0;
      ch.volE = 0;
      ch.panE = 0;
      ch.vL = 0;
      ch.vR = 0;
      ch.vLprev = 0;
      ch.vRprev = 0;
      ch.off = 0;
      ch.retrig = 0;
      ch.periodoffset = 0;
      ch.voloffset = 0;
      ch.fadeout = 65536;
      ch.tremorpos = 0;
      ch.autovib_pos = 0;
      ch.autovib_sweep = 0;
      ch.ramp = 1.0;
      ch.keyofftick = undefined;
      ch.delayednote = undefined;
      ch.notedelaytick = undefined;
      if (ch.filterstate) {
        ch.filterstate[0] = 0;
        ch.filterstate[1] = 0;
        ch.filterstate[2] = 0;
      }
    }
    player.xm.global_volumeslide = undefined;
  }

  // Pre-scan pattern sequence from order 0 to target position/row
  // to restore active BPM, tempo (ticks/row), and global volume.
  function scanSongStateUpTo(
    targetSongPos: number,
    targetRow = 0
  ): { tempo: number; bpm: number; globalVolume: number } {
    let curTempo = player.xm.initial_tempo || 6;
    let curBpm = player.xm.initial_bpm || 125;
    let curGlobalVol = player.max_global_volume || 128;

    const songpats = player.xm.songpats || [];
    const patterns = player.xm.patterns || [];
    const maxPos = Math.min(targetSongPos, songpats.length - 1);

    for (let pos = 0; pos <= maxPos; pos++) {
      const patIdx = songpats[pos];
      const pat = patterns[patIdx];
      if (!pat) continue;

      const maxRow =
        pos === targetSongPos ? Math.min(targetRow, pat.length) : pat.length;
      for (let r = 0; r < maxRow; r++) {
        const row = pat[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const eff = row[c][3];
          const param = row[c][4];
          if (eff === 0x0f) {
            if (param === 0) {
              // ignore
            } else if (param < 0x20) {
              curTempo = param;
            } else {
              curBpm = param;
            }
          } else if (eff === 0x10) {
            if (param <= 0x40) {
              curGlobalVol = Math.max(0, param * 2);
            } else {
              curGlobalVol = player.max_global_volume || 128;
            }
          }
        }
      }
    }

    return { tempo: curTempo, bpm: curBpm, globalVolume: curGlobalVol };
  }

  function seekToOrder(targetIdx: number): void {
    if (!player.xm || !player.xm.songpats || player.xm.songpats.length === 0)
      return;
    const clampedIdx = Math.max(
      0,
      Math.min(player.xm.songpats.length - 1, targetIdx)
    );
    const state = scanSongStateUpTo(clampedIdx, 0);
    silenceChannels();
    player.xm.tempo = state.tempo;
    player.xm.bpm = state.bpm;
    player.xm.global_volume = state.globalVolume;
    player.cur_songpos = clampedIdx;
    player.cur_row = 0;
    player.next_row = 0;
    player.cur_ticksamp = 0;
    player.pattern_delay = 0;
    vuSamples = 0;
    if (vuAcc.length > 0) vuAcc.fill(0);
    player.cur_tick = (player.xm.tempo || 6) - 1;
    setCurrentPattern();
  }

  const effects_t0: XMEffectTick0Fn[] = [
    // effect functions on tick 0
    eff_t1_0, // 1, arpeggio is processed on all ticks
    eff_t0_1,
    eff_t0_2,
    eff_t0_3,
    eff_t0_4, // 4
    eff_t0_a, // 5, same as A on first tick
    eff_t0_a, // 6, same as A on first tick
    eff_t0_7, // 7
    eff_t0_8, // 8
    eff_t0_9, // 9
    eff_t0_a, // a
    eff_t0_b, // b
    eff_t0_c, // c
    eff_t0_d, // d
    eff_t0_e, // e
    eff_t0_f, // f
    eff_t0_g, // g
    eff_t0_h, // h
    eff_unimplemented_t0, // i
    eff_unimplemented_t0, // j
    eff_t0_k, // k
    eff_t0_l, // l
    eff_unimplemented_t0, // m
    eff_unimplemented_t0, // n
    eff_unimplemented_t0, // o
    eff_t0_p, // p
    eff_unimplemented_t0, // q
    eff_t0_r, // r
    eff_unimplemented_t0, // s
    eff_t0_t, // t
    eff_unimplemented_t0, // u
    eff_unimplemented_t0, // v
    eff_unimplemented_t0, // w
    eff_t0_x, // x
    eff_unimplemented_t0, // y
    eff_unimplemented_t0 // z
  ];

  const effects_t1: (XMEffectTick1Fn | null)[] = [
    // effect functions on tick 1+
    eff_t1_0,
    eff_t1_1,
    eff_t1_2,
    eff_t1_3,
    eff_t1_4,
    eff_t1_5, // 5
    eff_t1_6, // 6
    eff_t1_7, // 7
    null, // 8
    null, // 9
    eff_t1_a, // a
    null, // b
    null, // c
    null, // d
    eff_t1_e, // e
    null, // f
    null, // g
    eff_t1_h, // h
    eff_unimplemented, // i
    eff_unimplemented, // j
    eff_t1_k, // k
    null, // l
    eff_unimplemented, // m
    eff_unimplemented, // n
    eff_unimplemented, // o
    eff_t1_p, // p
    eff_unimplemented, // q
    eff_t1_r, // r
    eff_unimplemented, // s
    eff_t1_t, // t
    eff_unimplemented, // u
    eff_unimplemented, // v
    eff_unimplemented, // w
    null, // x
    eff_unimplemented, // y
    eff_unimplemented // z
  ];

  const player: XMEngine = {
    cur_songpos: -1,
    cur_pat: -1,
    cur_row: 64,
    cur_ticksamp: 0,
    cur_tick: 6,
    pattern_delay: 0,
    xm: {
      global_volume: 128
    },
    max_global_volume: 128,
    playing: false,
    onEnded: null,
    XMView,
    effects_t0,
    effects_t1,
    periodForNote,
    updateChannelPeriod,
    prettify_effect,
    prettify_note,
    load,
    play,
    pause,
    stop,
    renderAudio,
    nextTick,
    nextRow,
    Envelope,
    setCurrentPattern,
    silenceChannels,
    scanSongStateUpTo,
    seekToOrder
  };

  return player;
}
