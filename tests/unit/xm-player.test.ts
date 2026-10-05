import { describe, it, expect } from 'vitest';
import { XMPlayer } from '../../lib/audio/xm-player';
import * as fs from 'node:fs';
import * as path from 'node:path';

const audioDir = path.resolve(__dirname, '../../public/audio');
const starterFiles = [
  '1_keygen-8.xm',
  '2_deadlock.xm',
  '3_butterfl.xm',
  '4_external.xm',
  '5_purple-motions.xm'
];
const onDiskXm = fs
  .readdirSync(audioDir)
  .filter((f) => f.toLowerCase().endsWith('.xm'));
const xmFiles = starterFiles.filter((f) => onDiskXm.includes(f));
if (xmFiles.length === 0) {
  xmFiles.push(...onDiskXm.slice(0, 5));
}

const readXm = (file: string): ArrayBuffer => {
  const buffer = fs.readFileSync(path.join(audioDir, file));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
};

// Lifecycle tests only need one representative track.
const sampleFile = xmFiles[0];

describe('XMPlayer', () => {
  it('instantiates cleanly with default options', () => {
    const player = new XMPlayer();
    expect(player).toBeDefined();
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBe('');
    expect(player.numChannels).toBe(0);
    expect(player.getProgress()).toBe(0);
  });

  it('has XM files to test against', () => {
    expect(xmFiles.length).toBeGreaterThan(0);
  });

  it.each(xmFiles)('loads and parses %s', (file) => {
    const player = new XMPlayer();
    const success = player.loadBuffer(readXm(file));

    expect(success).toBe(true);
    expect(player.numChannels).toBeGreaterThan(0);
    expect(player.isPlaying).toBe(false);
  });

  it('initializes with mock AudioContext and controls playback lifecycle', () => {
    const arrayBuffer = readXm(sampleFile);

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
    const arrayBuffer = readXm(sampleFile);

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
