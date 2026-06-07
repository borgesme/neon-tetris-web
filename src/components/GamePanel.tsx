import { TETROMINOES } from '../game/constants';
import type { GameAction, GamePhase, GameState, PieceType } from '../game/types';

interface GamePanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

const PIECE_CLASS: Record<PieceType, string> = {
  I: 'piece-i',
  J: 'piece-j',
  L: 'piece-l',
  O: 'piece-o',
  S: 'piece-s',
  T: 'piece-t',
  Z: 'piece-z'
};

function getPhaseAction(phase: GamePhase): { label: string; action: GameAction } {
  if (phase === 'playing') {
    return { label: 'Pause', action: { type: 'pause' } };
  }

  if (phase === 'paused') {
    return { label: 'Resume', action: { type: 'resume' } };
  }

  if (phase === 'gameOver') {
    return { label: 'Start', action: { type: 'restart' } };
  }

  return { label: 'Start', action: { type: 'start' } };
}

function PiecePreview({ piece }: { piece: PieceType | null }) {
  if (piece === null) {
    return <span className="empty-preview">Empty</span>;
  }

  const cells = TETROMINOES[piece][0];
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));

  return (
    <span className="piece-preview" aria-label={piece}>
      {cells.map((cell) => (
        <span
          className={`piece-cell ${PIECE_CLASS[piece]}`}
          key={`${cell.x}:${cell.y}`}
          style={{
            gridColumnStart: cell.x - minX + 1,
            gridRowStart: cell.y - minY + 1
          }}
        />
      ))}
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}

export function GamePanel({ state, dispatch }: GamePanelProps) {
  const phaseAction = getPhaseAction(state.phase);

  return (
    <aside className="game-panel" aria-label="Game information">
      <section className="panel-card hold-card">
        <h2>Hold</h2>
        <PiecePreview piece={state.hold} />
      </section>

      <section className="panel-card next-card">
        <h2>Next</h2>
        <div className="next-list">
          {state.nextQueue.slice(0, 5).map((piece, index) => (
            <PiecePreview piece={piece} key={`${piece}:${index}`} />
          ))}
        </div>
      </section>

      <section className="panel-card stats-card">
        <h2>Stats</h2>
        <div className="stats-grid">
          <StatTile label="Score" value={state.stats.score} />
          <StatTile label="Level" value={state.stats.level} />
          <StatTile label="Lines" value={state.stats.lines} />
        </div>
      </section>

      <section className="panel-card actions-card">
        <h2>Control</h2>
        <div className="panel-actions">
          <button className="primary" type="button" onClick={() => dispatch(phaseAction.action)}>
            {phaseAction.label}
          </button>
          <button type="button" onClick={() => dispatch({ type: 'restart' })}>
            Restart
          </button>
        </div>
      </section>
    </aside>
  );
}
