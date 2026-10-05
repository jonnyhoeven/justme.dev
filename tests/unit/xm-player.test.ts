import { describe, it, expect, beforeAll } from 'vitest';
import { XMPlayer } from '../../lib/audio/xm-player';

const MEDIA_BASE_URL = (
  process.env.R2_PUBLIC_URL || 'https://media.justme.dev'
).replace(/\/+$/, '');

// Use a single lightweight track (~25KB) to minimize bucket transfer usage during CI and dev.
const SAMPLE_TRACK = '5_purple-motions.xm';

let sampleBuffer: ArrayBuffer | null = null;

const getSampleBuffer = (): ArrayBuffer => {
  if (!sampleBuffer) {
    throw new Error(`Buffer not loaded for ${SAMPLE_TRACK}`);
  }
  return sampleBuffer.slice(0);
};

describe('XMPlayer', () => {
  beforeAll(async () => {
    const res = await fetch(`${MEDIA_BASE_URL}/audio/${SAMPLE_TRACK}`);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${SAMPLE_TRACK} from bucket: ${res.status} ${res.statusText}`
      );
    }
    sampleBuffer = await res.arrayBuffer();
  }, 15000);

  it('instantiates cleanly with default options', () => {
    const player = new XMPlayer();
    expect(player).toBeDefined();
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBe('');
    expect(player.numChannels).toBe(0);
    expect(player.getProgress()).toBe(0);
  });

  it('loads and parses sample XM file from media bucket', () => {
    const player = new XMPlayer();
    const success = player.loadBuffer(getSampleBuffer());

    expect(success).toBe(true);
    expect(player.numChannels).toBeGreaterThan(0);
    expect(player.isPlaying).toBe(false);
    expect(player.songTitle).toBeTruthy();
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
});
