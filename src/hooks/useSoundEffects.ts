import { useEffect, useRef } from 'react';
import { playSound, type SoundEvent } from '../audio/soundEngine';
import type { GameAction, GameState } from '../game/types';
import type { AppSettings } from '../storage/settings';

interface UseSoundEffectsOptions {
  state: GameState;
  action: GameAction | null;
  actionId: number;
  settings: AppSettings;
}

function activePositionChanged(previous: GameState, current: GameState): boolean {
  return (
    previous.active.position.x !== current.active.position.x ||
    previous.active.position.y !== current.active.position.y
  );
}

function activeChanged(previous: GameState, current: GameState): boolean {
  return (
    previous.active.type !== current.active.type ||
    previous.active.rotation !== current.active.rotation ||
    activePositionChanged(previous, current)
  );
}

function lockedPiece(previous: GameState, current: GameState): boolean {
  return previous.board !== current.board || previous.canHold !== current.canHold;
}

export function getSoundEvent(
  previous: GameState,
  current: GameState,
  action: GameAction | null
): SoundEvent | undefined {
  if (current.phase === 'gameOver' && previous.phase !== 'gameOver') {
    return 'gameOver';
  }

  if (current.stats.level > previous.stats.level) {
    return 'levelUp';
  }

  if (current.stats.lines > previous.stats.lines) {
    return 'lineClear';
  }

  if (!action) {
    return undefined;
  }

  if ((action.type === 'start' || action.type === 'restart') && current.phase === 'playing') {
    return previous.phase === 'playing' && action.type === 'start' ? undefined : 'start';
  }

  if (action.type === 'pause' && previous.phase === 'playing' && current.phase === 'paused') {
    return 'pause';
  }

  if (action.type === 'resume' && previous.phase === 'paused' && current.phase === 'playing') {
    return 'resume';
  }

  if (action.type === 'move' && activePositionChanged(previous, current)) {
    return 'move';
  }

  if (action.type === 'rotate' && activeChanged(previous, current)) {
    return 'rotate';
  }

  if (action.type === 'softDrop' && current.active.position.y > previous.active.position.y) {
    return 'softDrop';
  }

  if (action.type === 'hardDrop' && previous !== current) {
    return 'hardDrop';
  }

  if (action.type === 'hold' && previous !== current) {
    return 'hold';
  }

  if ((action.type === 'tick' || action.type === 'softDrop') && lockedPiece(previous, current)) {
    return 'lock';
  }

  return undefined;
}

export function useSoundEffects({ state, action, actionId, settings }: UseSoundEffectsOptions) {
  const previousStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = state;
    if (!previousState || !settings.soundEnabled) {
      return;
    }

    const soundEvent = getSoundEvent(previousState, state, action);
    if (soundEvent) {
      playSound(soundEvent, settings.volume);
    }
  }, [action, actionId, settings.soundEnabled, settings.volume, state]);
}
