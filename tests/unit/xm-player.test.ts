import { describe, it, expect } from 'vitest';
import { XMPlayer } from '../../lib/audio/xm-player';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('XMPlayer', () => {
  it('instantiates cleanly with default options', () => {
    const player = new XMPlayer();
    expect(player).toBeDefined();
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBe('');
    expect(player.numChannels).toBe(0);
    expect(player.getProgress()).toBe(0);
  });

  it('loads and parses purple-motions.xm correctly', () => {
    const filePath = path.resolve(
      __dirname,
      '../../public/audio/2_purple-motions.xm'
    );
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    const player = new XMPlayer();
    const success = player.loadBuffer(arrayBuffer);

    expect(success).toBe(true);
    expect(player.songTitle).toBe('purple motions');
    expect(player.numChannels).toBe(12);
    expect(player.isPlaying).toBe(false);
  });

  it('initializes with mock AudioContext and controls playback lifecycle', () => {
    const filePath = path.resolve(
      __dirname,
      '../../public/audio/2_purple-motions.xm'
    );
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

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

  it('loads 1_keygen-8.xm correctly', () => {
    const filePath = path.resolve(
      __dirname,
      '../../public/audio/1_keygen-8.xm'
    );
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    const player = new XMPlayer();
    const success = player.loadBuffer(arrayBuffer);

    expect(success).toBe(true);
    expect(player.numChannels).toBeGreaterThan(0);
  });

  it('loads butterfl.xm correctly', () => {
    const filePath = path.resolve(__dirname, '../../public/audio/butterfl.xm');
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    const player = new XMPlayer();
    const success = player.loadBuffer(arrayBuffer);

    expect(success).toBe(true);
    expect(player.songTitle).toBe('Butterfly Flew Away');
    expect(player.numChannels).toBe(16);
  });

  it('does not fire onEnded prematurely during initial pattern playback', () => {
    const filePath = path.resolve(
      __dirname,
      '../../public/audio/2_purple-motions.xm'
    );
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

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
});
