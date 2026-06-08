export type SoundEvent =
  | 'start'
  | 'pause'
  | 'resume'
  | 'move'
  | 'rotate'
  | 'softDrop'
  | 'hardDrop'
  | 'hold'
  | 'lock'
  | 'lineClear'
  | 'levelUp'
  | 'gameOver'
  | 'button';

interface SoundNote {
  frequency: number;
  duration: number;
  delay?: number;
}

interface SoundPattern {
  type: OscillatorType;
  peak: number;
  notes: SoundNote[];
}

type AudioContextConstructor = new () => AudioContext;

interface WindowWithAudioContext extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

const PATTERNS: Record<SoundEvent, SoundPattern> = {
  start: { type: 'triangle', peak: 0.26, notes: [{ frequency: 392, duration: 0.06 }, { frequency: 784, duration: 0.1, delay: 0.06 }] },
  pause: { type: 'sine', peak: 0.18, notes: [{ frequency: 320, duration: 0.11 }] },
  resume: { type: 'triangle', peak: 0.22, notes: [{ frequency: 440, duration: 0.05 }, { frequency: 660, duration: 0.08, delay: 0.05 }] },
  move: { type: 'square', peak: 0.08, notes: [{ frequency: 220, duration: 0.035 }] },
  rotate: { type: 'triangle', peak: 0.13, notes: [{ frequency: 520, duration: 0.045 }] },
  softDrop: { type: 'sine', peak: 0.08, notes: [{ frequency: 180, duration: 0.035 }] },
  hardDrop: { type: 'sawtooth', peak: 0.2, notes: [{ frequency: 110, duration: 0.08 }, { frequency: 82, duration: 0.07, delay: 0.04 }] },
  hold: { type: 'triangle', peak: 0.18, notes: [{ frequency: 330, duration: 0.05 }, { frequency: 494, duration: 0.06, delay: 0.04 }] },
  lock: { type: 'square', peak: 0.13, notes: [{ frequency: 150, duration: 0.055 }] },
  lineClear: { type: 'triangle', peak: 0.26, notes: [{ frequency: 660, duration: 0.06 }, { frequency: 880, duration: 0.08, delay: 0.05 }] },
  levelUp: { type: 'triangle', peak: 0.3, notes: [{ frequency: 523, duration: 0.06 }, { frequency: 784, duration: 0.07, delay: 0.05 }, { frequency: 1047, duration: 0.11, delay: 0.11 }] },
  gameOver: { type: 'sawtooth', peak: 0.24, notes: [{ frequency: 220, duration: 0.12 }, { frequency: 165, duration: 0.14, delay: 0.1 }, { frequency: 110, duration: 0.18, delay: 0.22 }] },
  button: { type: 'sine', peak: 0.1, notes: [{ frequency: 480, duration: 0.04 }] }
};

let audioContext: AudioContext | null = null;

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0;
  }

  return Math.min(1, Math.max(0, volume));
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ?? (window as WindowWithAudioContext).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  try {
    audioContext ??= new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

export function unlockAudio(): void {
  const context = getAudioContext();
  if (!context || context.state !== 'suspended') {
    return;
  }

  void context.resume().catch(() => undefined);
}

function playNote(context: AudioContext, note: SoundNote, pattern: SoundPattern, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + (note.delay ?? 0);
  const end = start + note.duration;
  const peak = Math.max(0.0001, pattern.peak * volume);

  oscillator.type = pattern.type;
  oscillator.frequency.setValueAtTime(note.frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

export function playSound(event: SoundEvent, volume: number): void {
  const context = getAudioContext();
  const pattern = PATTERNS[event];
  const safeVolume = clampVolume(volume);
  if (!context || !pattern || safeVolume === 0 || context.state === 'suspended') {
    return;
  }

  for (const note of pattern.notes) {
    playNote(context, note, pattern, safeVolume);
  }
}

export function disposeAudio(): void {
  const context = audioContext;
  audioContext = null;
  void context?.close().catch(() => undefined);
}
