import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GamePhase } from '../game/types';

const ACTIONS: Record<string, GameAction> = {
  ArrowLeft: { type: 'move', dx: -1 },
  ArrowRight: { type: 'move', dx: 1 },
  ArrowDown: { type: 'softDrop' },
  ArrowUp: { type: 'rotate', direction: 1 },
  x: { type: 'rotate', direction: 1 },
  X: { type: 'rotate', direction: 1 },
  z: { type: 'rotate', direction: -1 },
  Z: { type: 'rotate', direction: -1 },
  c: { type: 'hold' },
  C: { type: 'hold' },
  r: { type: 'restart' },
  R: { type: 'restart' },
  ' ': { type: 'hardDrop' },
  Space: { type: 'hardDrop' }
};

interface UseKeyboardControlsOptions {
  phase: GamePhase;
  dispatch: Dispatch<GameAction>;
}

function hasReservedModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(
      'input, textarea, select, button, a[href], [contenteditable], [role="button"], [role="textbox"]'
    ) !== null
  );
}

function getKeyboardAction(event: KeyboardEvent, phase: GamePhase): GameAction | undefined {
  if (event.key === 'p' || event.key === 'P') {
    if (phase === 'playing') {
      return { type: 'pause' };
    }
    if (phase === 'paused') {
      return { type: 'resume' };
    }
    return undefined;
  }

  return ACTIONS[event.code] ?? ACTIONS[event.key];
}

export function useKeyboardControls({ phase, dispatch }: UseKeyboardControlsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (hasReservedModifier(event) || isIgnoredTarget(event.target)) {
        return;
      }

      const action = getKeyboardAction(event, phase);
      if (!action) {
        return;
      }

      event.preventDefault();
      dispatch(action);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, phase]);
}
