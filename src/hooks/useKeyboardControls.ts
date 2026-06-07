import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { GameAction } from '../game/types';

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
  p: { type: 'pause' },
  P: { type: 'pause' },
  r: { type: 'restart' },
  R: { type: 'restart' },
  Space: { type: 'hardDrop' }
};

function isIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function useKeyboardControls(dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isIgnoredTarget(event.target)) {
        return;
      }

      const action = ACTIONS[event.code] ?? ACTIONS[event.key];
      if (!action) {
        return;
      }

      event.preventDefault();
      dispatch(action);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);
}
