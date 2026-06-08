import { afterEach, describe, expect, test, vi } from 'vitest';
import { disposeAudio, playSound, type SoundEvent } from './soundEngine';

const gainValues: number[] = [];

class FakeAudioParam {
  constructor(private readonly captureGain = false) {}

  setValueAtTime = vi.fn((value: number) => {
    if (this.captureGain) {
      gainValues.push(value);
    }
  });

  exponentialRampToValueAtTime = vi.fn((value: number) => {
    if (this.captureGain) {
      gainValues.push(value);
    }
  });
}

class FakeOscillator {
  type: OscillatorType = 'sine';
  frequency = new FakeAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = new FakeAudioParam(true);
  connect = vi.fn();
}

class FakeAudioContext {
  currentTime = 1;
  destination = {};
  state: AudioContextState = 'running';
  createOscillator = vi.fn(() => new FakeOscillator());
  createGain = vi.fn(() => new FakeGain());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('soundEngine', () => {
  afterEach(() => {
    gainValues.length = 0;
    disposeAudio();
    vi.unstubAllGlobals();
  });

  test('playSound no-ops when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);

    expect(() => playSound('move', 0.7)).not.toThrow();
  });

  test('playSound clamps volume before applying gain', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);

    playSound('move', 4);

    expect(Math.max(...gainValues)).toBe(0.08);

    gainValues.length = 0;
    playSound('move', -1);

    expect(gainValues).toHaveLength(0);
  });

  test('all known sound events are accepted', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const events: SoundEvent[] = [
      'start',
      'pause',
      'resume',
      'move',
      'rotate',
      'softDrop',
      'hardDrop',
      'hold',
      'lock',
      'lineClear',
      'levelUp',
      'gameOver',
      'button'
    ];

    for (const event of events) {
      expect(() => playSound(event, 0.4)).not.toThrow();
    }
  });
});
