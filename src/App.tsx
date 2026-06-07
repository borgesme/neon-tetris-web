import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GamePanel } from './components/GamePanel';
import { LeaderboardDialog } from './components/LeaderboardDialog';
import { PwaInstallButton } from './components/PwaInstallButton';
import { SettingsDialog } from './components/SettingsDialog';
import { TouchControls } from './components/TouchControls';
import { createInitialState, gameReducer } from './game/rules';
import type { GameAction, GamePhase } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { shareScore } from './share/shareScore';
import { addScore } from './storage/leaderboard';
import { readSettings, writeSettings } from './storage/settings';

const PHASE_TEXT: Record<GamePhase, string> = {
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  gameOver: 'Game Over'
};

export default function App() {
  const [state, rawDispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [settings, setSettings] = useState(readSettings);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const submittedScoreRef = useRef<string | null>(null);
  const dispatch = useCallback((action: GameAction) => rawDispatch(action), []);

  useGameLoop({ phase: state.phase, level: state.stats.level, dispatch });
  useKeyboardControls({ phase: state.phase, dispatch });

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

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
    setLeaderboardVersion((version) => version + 1);
  }, [state.bagSeed, state.phase, state.stats.level, state.stats.lines, state.stats.score]);

  const currentScore = {
    score: state.stats.score,
    level: state.stats.level,
    lines: state.stats.lines,
    createdAt: new Date().toISOString()
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Arcade stack</p>
          <h1>Neon Tetris</h1>
        </div>
        <div className="header-actions">
          <p className="phase-pill" aria-live="polite">
            {PHASE_TEXT[state.phase]}
          </p>
          <button type="button" onClick={() => setLeaderboardOpen(true)}>
            Scores
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" onClick={() => void shareScore(currentScore)}>
            Share
          </button>
          <PwaInstallButton />
        </div>
      </header>

      <section className="game-main" aria-label="Tetris game">
        <div className="board-frame">
          <GameCanvas state={state} />
        </div>
        <GamePanel state={state} dispatch={dispatch} />
      </section>

      <TouchControls dispatch={dispatch} />

      <LeaderboardDialog
        open={leaderboardOpen}
        refreshKey={leaderboardVersion}
        onClose={() => setLeaderboardOpen(false)}
      />
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
