// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * AudioWorkletProcessor that runs the FastTracker 2 (.XM) mixer off the main
 * thread and posts per-tick playback state + optional VU/scope buffers back.
 */

import { createXMEngine, type XMEngine, type XMScopeFrame } from './xm-engine';

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const sampleRate: number;
declare const currentTime: number;

export type XMWorkletCommand =
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'seek'; orderIdx: number }
  | { type: 'setBpm'; bpm: number }
  | { type: 'resetBpm' }
  | { type: 'setChannelMute'; channelIdx: number; mute: boolean }
  | { type: 'setScopeWidth'; width: number };

export type XMWorkletEvent =
  | {
      type: 'tick';
      songpos: number;
      pat: number;
      row: number;
      bpm: number;
      tempo: number;
      vu?: Float32Array;
      scopes?: Float32Array[];
    }
  | { type: 'ended' };

const BaseProcessor = (
  typeof AudioWorkletProcessor !== 'undefined'
    ? AudioWorkletProcessor
    : class {}
) as typeof AudioWorkletProcessor;

export class XMWorkletProcessor extends BaseProcessor {
  private engine: XMEngine;

  constructor() {
    super();
    this.engine = createXMEngine();

    this.engine.onEnded = () => {
      const msg: XMWorkletEvent = { type: 'ended' };
      this.port.postMessage(msg);
    };

    this.engine.XMView.pushEvent = (frame: XMScopeFrame) => {
      const msg: XMWorkletEvent = {
        type: 'tick',
        songpos: frame.songpos,
        pat: frame.pat,
        row: frame.row,
        bpm: this.engine.xm.bpm || 125,
        tempo: this.engine.xm.tempo || 6
      };
      if (this.engine.XMView.scope_width > 0) {
        msg.vu = frame.vu;
        msg.scopes = frame.scopes;
      }
      this.port.postMessage(msg);
    };

    this.port.onmessage = (e: MessageEvent<XMWorkletCommand>) => {
      this.handleCommand(e.data);
    };
  }

  private handleCommand(cmd: XMWorkletCommand): void {
    switch (cmd.type) {
      case 'load':
        this.engine.stop();
        this.engine.load(cmd.buffer);
        break;
      case 'play':
        this.engine.play();
        break;
      case 'pause':
        this.engine.pause();
        break;
      case 'stop':
        this.engine.stop();
        break;
      case 'seek':
        this.engine.seekToOrder(cmd.orderIdx);
        break;
      case 'setBpm':
        this.engine.xm.bpm = Math.max(32, Math.min(255, Math.round(cmd.bpm)));
        break;
      case 'resetBpm':
        this.engine.xm.bpm = this.engine.xm.initial_bpm || 125;
        break;
      case 'setChannelMute':
        if (this.engine.xm.channelinfo?.[cmd.channelIdx]) {
          this.engine.xm.channelinfo[cmd.channelIdx].mute = cmd.mute ? 1 : 0;
        }
        break;
      case 'setScopeWidth':
        this.engine.XMView.scope_width = cmd.width;
        break;
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    if (!output || output.length < 2) return true;
    if (!this.engine.playing) return true;

    const sr = typeof sampleRate === 'number' ? sampleRate : 44100;
    const t = typeof currentTime === 'number' ? currentTime : 0;
    this.engine.renderAudio(output[0], output[1], sr, t);
    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('xm-processor', XMWorkletProcessor);
}
