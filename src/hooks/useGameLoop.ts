import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { getGravityMs } from '../game/rules';
import type { GameAction, GamePhase } from '../game/types';

interface UseGameLoopProps {
  phase: GamePhase;
  level: number;
  dispatch: Dispatch<GameAction>;
}

export function useGameLoop({ phase, level, dispatch }: UseGameLoopProps) {
  const frameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== 'playing') {
      return undefined;
    }

    const gravityMs = getGravityMs(level);

    function loop(timestamp: number) {
      if (previousTimeRef.current === null) {
        previousTimeRef.current = timestamp;
      }

      const elapsed = timestamp - previousTimeRef.current;
      if (elapsed >= gravityMs) {
        dispatch({ type: 'tick' });
        previousTimeRef.current = timestamp;
      }

      frameRef.current = requestAnimationFrame(loop);
    }

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      previousTimeRef.current = null;
    };
  }, [dispatch, level, phase]);
}
