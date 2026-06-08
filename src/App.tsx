import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GamePanel } from './components/GamePanel';
import { LeaderboardDialog } from './components/LeaderboardDialog';
import { PwaInstallButton } from './components/PwaInstallButton';
import { SettingsDialog } from './components/SettingsDialog';
import { TouchControls } from './components/TouchControls';
import { unlockAudio } from './audio/soundEngine';
import { createInitialState, gameReducer } from './game/rules';
import type { GameAction, GamePhase } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useSoundEffects } from './hooks/useSoundEffects';
import { shareScore } from './share/shareScore';
import { addScore } from './storage/leaderboard';
import { readSettings, writeSettings, type AppSettings } from './storage/settings';

const PHASE_TEXT: Record<GamePhase, string> = {
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  gameOver: 'Game Over'
};

const SHARE_STATUS_TEXT = {
  shared: 'Share dialog opened.',
  copied: 'Score copied to clipboard.',
  unsupported: 'Sharing is not supported in this browser.'
} as const;

interface GameSnapshot {
  game: ReturnType<typeof createInitialState>;
  lastAction: GameAction | null;
  actionId: number;
}

function createInitialSnapshot(): GameSnapshot {
  return {
    game: createInitialState(),
    lastAction: null,
    actionId: 0
  };
}

function appReducer(snapshot: GameSnapshot, action: GameAction): GameSnapshot {
  return {
    game: gameReducer(snapshot.game, action),
    lastAction: action,
    actionId: snapshot.actionId + 1
  };
}

export default function App() {
  const [snapshot, rawDispatch] = useReducer(appReducer, undefined, createInitialSnapshot);
  const [settings, setSettings] = useState(readSettings);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<keyof typeof SHARE_STATUS_TEXT | null>(null);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const submittedScoreRef = useRef<string | null>(null);
  const state = snapshot.game;
  const dispatch = useCallback(
    (action: GameAction) => {
      if (settings.soundEnabled) {
        unlockAudio();
      }
      rawDispatch(action);
    },
    [settings.soundEnabled]
  );
  const handleSettingsChange = useCallback((nextSettings: AppSettings) => {
    if (nextSettings.soundEnabled) {
      unlockAudio();
    }
    setSettings(nextSettings);
  }, []);

  useGameLoop({ phase: state.phase, level: state.stats.level, dispatch });
  useKeyboardControls({ phase: state.phase, dispatch });
  useSoundEffects({
    state,
    action: snapshot.lastAction,
    actionId: snapshot.actionId,
    settings
  });

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (state.phase !== 'gameOver') {
      return;
    }

    const scoreKey = [state.bagSeed, state.stats.score, state.stats.level, state.stats.lines].join(
      ':'
    );
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

  const handleShare = useCallback(async () => {
    const currentScore = {
      score: state.stats.score,
      level: state.stats.level,
      lines: state.stats.lines,
      createdAt: new Date().toISOString()
    };
    const result = await shareScore(currentScore);
    setShareStatus(result);
  }, [state.stats.level, state.stats.lines, state.stats.score]);

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
          <button type="button" onClick={() => void handleShare()}>
            Share
          </button>
          <PwaInstallButton />
          {shareStatus && (
            <p className="share-status" aria-live="polite">
              {SHARE_STATUS_TEXT[shareStatus]}
            </p>
          )}
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
        onChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
