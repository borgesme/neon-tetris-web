import { useCallback, useEffect, useReducer, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GamePanel } from './components/GamePanel';
import { TouchControls } from './components/TouchControls';
import { createInitialState, gameReducer } from './game/rules';
import type { GameAction, GamePhase } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { addScore } from './storage/leaderboard';

const PHASE_TEXT: Record<GamePhase, string> = {
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  gameOver: 'Game Over'
};

export default function App() {
  const [state, rawDispatch] = useReducer(gameReducer, undefined, createInitialState);
  const submittedScoreRef = useRef<string | null>(null);
  const dispatch = useCallback((action: GameAction) => rawDispatch(action), []);

  useGameLoop({ phase: state.phase, level: state.stats.level, dispatch });
  useKeyboardControls({ phase: state.phase, dispatch });

  useEffect(() => {
    if (state.phase !== 'gameOver') {
      return;
    }

    const scoreKey = [
      state.bagSeed,
      state.stats.score,
      state.stats.level,
      state.stats.lines
    ].join(':');
    if (submittedScoreRef.current === scoreKey) {
      return;
    }

    submittedScoreRef.current = scoreKey;
    addScore({
      score: state.stats.score,
      level: state.stats.level,
      lines: state.stats.lines,
      createdAt: new Date().toISOString()
    });
  }, [state.bagSeed, state.phase, state.stats.level, state.stats.lines, state.stats.score]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Arcade stack</p>
          <h1>Neon Tetris</h1>
        </div>
        <p className="phase-pill" aria-live="polite">
          {PHASE_TEXT[state.phase]}
        </p>
      </header>

      <section className="game-main" aria-label="Tetris game">
        <div className="board-frame">
          <GameCanvas state={state} />
        </div>
        <GamePanel state={state} dispatch={dispatch} />
      </section>

      <TouchControls dispatch={dispatch} />
    </main>
  );
}
