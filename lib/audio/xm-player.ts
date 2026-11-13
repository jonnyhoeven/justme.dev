// SPDX-FileCopyrightText: 2015 Andy Sloane <andy@a1k0n.net> (jsxm, MIT License)
// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later AND MIT
/**
 * FastTracker 2 (.XM) Player for Web Audio API.
 * Parses module metadata on the main thread for UI/pattern inspection and
 * offloads sample mixing to an AudioWorkletProcessor (`xm-worklet.ts`).
 */

import {
  createXMEngine,
  type XMEngine,
  type XMInstrumentInfo,
  type XMPattern,
  type XMTrackerState
} from './xm-engine';
import type { XMWorkletCommand, XMWorkletEvent } from './xm-worklet';
import workletUrl from './xm-worklet.ts?worker&url';

export {
  Envelope,
  EnvelopeFollower,
  createXMEngine,
  type InstrumentInfo,
  type InstrumentSampleInfo,
  type TrackerState,
  type XMChannelState,
  type XMEffectTick0Fn,
  type XMEffectTick1Fn,
  type XMEngine,
  type XMInstrument,
  type XMInstrumentInfo,
  type XMInstrumentSampleInfo,
  type XMNoteData,
  type XMPattern,
  type XMPatternRow,
  type XMSample,
  type XMScopeFrame,
  type XMSong,
  type XMTrackerState,
  type XMViewInternal
} from './xm-engine';

export interface XMPlayerOptions {
  bufferSize?: number;
  onEnded?: () => void;
}

export type XMScopeListener = (data: {
  vu: Float32Array;
  scopes?: Float32Array[];
}) => void;

export class XMPlayer {
  public engine: XMEngine;
  public audioctx: AudioContext | null = null;
  public outputNode: GainNode | null = null;
  public ready: Promise<void> = Promise.resolve();
  public onEnded?: () => void;
  public orderOffsets: number[] = [];
  public totalRows: number = 0;

  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private pendingBuffer: ArrayBuffer | null = null;
  private scopeWidth = 0;
  private scopeListener: XMScopeListener | null = null;

  // Main-thread buffers reused across tick messages from the worklet.
  private vuBuf = new Float32Array(0);
  private scopeBufs: Float32Array[] = [];
  private scopeBufsWidth = -1;
  private scopePayload: { vu: Float32Array; scopes?: Float32Array[] } = {
    vu: this.vuBuf
  };

  constructor(options?: XMPlayerOptions) {
    this.onEnded = options?.onEnded;
    this.engine = createXMEngine();
    this.engine.onEnded = () => {
      this.onEnded?.();
    };
  }

  get isPlaying(): boolean {
    return !!this.engine.playing;
  }

  get songTitle(): string {
    return (this.engine.xm.songname || '').trim();
  }

  get numChannels(): number {
    return this.engine.xm.nchan || 0;
  }

  init(ctx?: AudioContext): GainNode | null {
    if (ctx) {
      this.audioctx = ctx;
    } else if (!this.audioctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext;
      if (AudioCtx) this.audioctx = new AudioCtx();
    }
    if (!this.audioctx) return null;

    this.gainNode = this.audioctx.createGain();
    this.gainNode.gain.value = 1.0;
    this.outputNode = this.gainNode;

    if (this.audioctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      this.ready = this.initWorklet(this.audioctx);
    } else {
      this.ready = Promise.resolve();
    }

    return this.gainNode;
  }

  private async initWorklet(ctx: AudioContext): Promise<void> {
    await ctx.audioWorklet.addModule(workletUrl);
    if (this.audioctx !== ctx) return;

    const node = new AudioWorkletNode(ctx, 'xm-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    node.port.onmessage = (e: MessageEvent<XMWorkletEvent>) => {
      this.handleWorkletMessage(e.data);
    };

    this.workletNode = node;

    if (this.pendingBuffer) {
      const buf = this.pendingBuffer;
      this.pendingBuffer = null;
      this.postCommand({ type: 'load', buffer: buf }, [buf]);
    }

    if (this.scopeWidth > 0) {
      this.postCommand({ type: 'setScopeWidth', width: this.scopeWidth });
    }

    const channels = this.engine.xm.channelinfo || [];
    for (let i = 0; i < channels.length; i++) {
      if (channels[i]?.mute) {
        this.postCommand({ type: 'setChannelMute', channelIdx: i, mute: true });
      }
    }

    if (
      this.engine.xm.bpm &&
      this.engine.xm.bpm !== this.engine.xm.initial_bpm
    ) {
      this.postCommand({ type: 'setBpm', bpm: this.engine.xm.bpm });
    }

    if (this.engine.playing) {
      if (this.gainNode) node.connect(this.gainNode);
      this.postCommand({ type: 'play' });
    }
  }

  private postCommand(cmd: XMWorkletCommand, transfer?: Transferable[]): void {
    if (!this.workletNode) return;
    if (transfer) {
      this.workletNode.port.postMessage(cmd, transfer);
    } else {
      this.workletNode.port.postMessage(cmd);
    }
  }

  private handleWorkletMessage(msg: XMWorkletEvent): void {
    if (msg.type === 'ended') {
      this.disconnectWorklet();
      this.engine.playing = false;
      this.onEnded?.();
      return;
    }

    if (msg.type === 'tick') {
      this.engine.cur_songpos = msg.songpos;
      this.engine.cur_pat = msg.pat;
      this.engine.cur_row = msg.row;
      this.engine.xm.bpm = msg.bpm;
      this.engine.xm.tempo = msg.tempo;

      if (this.scopeListener && msg.vu) {
        const nchan = msg.vu.length;
        if (this.vuBuf.length !== nchan) {
          this.vuBuf = new Float32Array(nchan);
        }
        this.vuBuf.set(msg.vu);
        this.scopePayload.vu = this.vuBuf;

        if (msg.scopes && msg.scopes.length > 0) {
          const width = msg.scopes[0].length;
          if (
            this.scopeBufsWidth !== width ||
            this.scopeBufs.length !== nchan
          ) {
            this.scopeBufs = [];
            for (let j = 0; j < nchan; j++) {
              this.scopeBufs.push(new Float32Array(width));
            }
            this.scopeBufsWidth = width;
          }
          for (let j = 0; j < nchan; j++) {
            if (msg.scopes[j]) this.scopeBufs[j].set(msg.scopes[j]);
          }
          this.scopePayload.scopes = this.scopeBufs;
        } else {
          this.scopePayload.scopes = undefined;
        }

        this.scopeListener(this.scopePayload);
      }
    }
  }

  private disconnectWorklet(): void {
    if (this.workletNode && this.gainNode) {
      try {
        this.workletNode.disconnect(this.gainNode);
      } catch {
        // Disconnect can throw if not connected
      }
    }
  }

  async loadUrl(url: string): Promise<boolean> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to load XM file: HTTP ' + res.status);
    }
    const buf = await res.arrayBuffer();
    return this.loadBuffer(buf);
  }

  loadBuffer(buf: ArrayBuffer): boolean {
    this.stop();
    try {
      const ok = this.engine.load(buf);
      if (!ok) {
        this.orderOffsets = [];
        this.totalRows = 0;
        this.pendingBuffer = null;
        return false;
      }
      const songpats = this.engine.xm.songpats || [];
      const patterns = this.engine.xm.patterns || [];
      this.orderOffsets = [];
      let total = 0;
      for (let i = 0; i < songpats.length; i++) {
        this.orderOffsets.push(total);
        const patIdx = songpats[i];
        const patRows = patterns[patIdx] ? patterns[patIdx].length : 64;
        total += patRows;
      }
      this.totalRows = total;

      const copy = buf.slice(0);
      if (this.workletNode) {
        this.postCommand({ type: 'load', buffer: copy }, [copy]);
      } else {
        this.pendingBuffer = copy;
      }
      return true;
    } catch {
      this.orderOffsets = [];
      this.totalRows = 0;
      this.pendingBuffer = null;
      return false;
    }
  }

  play(): void {
    if (!this.engine.playing && this.workletNode && this.gainNode) {
      this.workletNode.connect(this.gainNode);
    }
    this.engine.play();
    this.postCommand({ type: 'play' });
  }

  pause(): void {
    if (this.engine.playing) {
      this.disconnectWorklet();
    }
    this.engine.pause();
    this.postCommand({ type: 'pause' });
  }

  stop(): void {
    if (this.engine.playing) {
      this.disconnectWorklet();
    }
    this.engine.stop();
    this.postCommand({ type: 'stop' });
  }

  setVolume(vol: number): void {
    if (this.gainNode && this.gainNode.gain) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  getProgress(): number {
    if (!this.engine.xm || !this.engine.xm.songpats || this.totalRows === 0)
      return 0;
    if (this.engine.cur_songpos < 0) return 0;
    const curPos = Math.max(
      0,
      Math.min(this.engine.xm.songpats.length - 1, this.engine.cur_songpos)
    );
    const patIdx = this.engine.xm.songpats[curPos];
    const patRows = this.engine.xm.patterns?.[patIdx]?.length || 64;
    const curRow = Math.max(0, Math.min(patRows - 1, this.engine.cur_row));
    const currentTotalRows = (this.orderOffsets[curPos] || 0) + curRow;
    const progress = (currentTotalRows / this.totalRows) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  seek(percent: number): void {
    if (!this.engine.xm || !this.engine.xm.songpats) return;
    const totalPats = this.engine.xm.songpats.length;
    if (totalPats === 0) return;
    const targetIdx = Math.floor(
      Math.max(0, Math.min(0.999, percent)) * totalPats
    );
    this.engine.seekToOrder(targetIdx);
    this.postCommand({ type: 'seek', orderIdx: targetIdx });
  }

  jumpToOrder(orderIdx: number): void {
    if (!this.engine.xm || !this.engine.xm.songpats) return;
    if (orderIdx < 0 || orderIdx >= this.engine.xm.songpats.length) return;
    this.engine.seekToOrder(orderIdx);
    this.postCommand({ type: 'seek', orderIdx });
  }

  getTrackerState(includeSongpats = true): XMTrackerState {
    const xm = this.engine.xm || {};
    return {
      curSongPos: this.engine.cur_songpos,
      curPat: this.engine.cur_pat,
      curRow: this.engine.cur_row,
      bpm: xm.bpm || 125,
      tempo: xm.tempo || 6,
      songlen: xm.songpats ? xm.xm_songlen || xm.songpats.length : 0,
      songpats: includeSongpats && xm.songpats ? [...xm.songpats] : [],
      numChannels: xm.nchan || 0
    };
  }

  getPattern(patIndex: number): XMPattern | null {
    if (!this.engine.xm?.patterns) return null;
    return this.engine.xm.patterns[patIndex] || null;
  }

  getInstruments(): XMInstrumentInfo[] {
    if (!this.engine.xm?.instruments) return [];
    return this.engine.xm.instruments.map((inst, idx) => ({
      index: idx + 1,
      name: (inst.name || '').trim(),
      samples: (inst.samples || []).map((s) => ({
        name: (s.sampname || '').trim(),
        len: s.len || 0,
        vol: s.vol ?? 64,
        pan: s.pan ?? 128,
        loop: s.loop || 0,
        looplen: s.looplen || 0,
        type: s.type || 0
      }))
    }));
  }

  setChannelMute(channelIdx: number, mute: boolean): void {
    if (!this.engine.xm?.channelinfo) return;
    if (this.engine.xm.channelinfo[channelIdx]) {
      this.engine.xm.channelinfo[channelIdx].mute = mute ? 1 : 0;
    }
    this.postCommand({ type: 'setChannelMute', channelIdx, mute });
  }

  setBpm(bpm: number): void {
    if (!this.engine.xm) return;
    const clamped = Math.max(32, Math.min(255, Math.round(bpm)));
    this.engine.xm.bpm = clamped;
    this.postCommand({ type: 'setBpm', bpm: clamped });
  }

  resetBpm(): void {
    if (!this.engine.xm) return;
    this.engine.xm.bpm = this.engine.xm.initial_bpm || 125;
    this.postCommand({ type: 'resetBpm' });
  }

  get defaultBpm(): number {
    return this.engine.xm?.initial_bpm || 125;
  }

  setScopeListener(listener: XMScopeListener | null, width = 64): void {
    this.scopeListener = listener;
    this.scopeWidth = listener ? width : 0;
    if (this.engine.XMView) {
      this.engine.XMView.scope_width = this.scopeWidth;
    }
    this.postCommand({ type: 'setScopeWidth', width: this.scopeWidth });
  }

  static prettifyNote(note: number): string {
    if (note < 0) return '···';
    if (note === 96) return '^^^';
    const noteNames = [
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
    return noteNames[note % 12] + Math.floor(note / 12);
  }

  static prettifyEffect(type: number, param: number): string {
    if (type === 0 && param === 0) return '···';
    const t = type >= 10 ? String.fromCharCode(55 + type) : type.toString();
    const p = param < 16 ? '0' + param.toString(16) : param.toString(16);
    return (t + p).toUpperCase();
  }
}
