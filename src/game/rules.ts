import { BOARD_WIDTH, SCORE_BY_LINES, VISIBLE_QUEUE_SIZE, getGravityMs } from './constants';
import { clearFullLines, createEmptyBoard, isValidPosition, mergePiece } from './board';
import { createSeededRng, createSevenBag } from './random';
import type { ActivePiece, GameAction, GameState, PieceType } from './types';

type InternalGameState = GameState & {
  seed: number;
  nextIndex: number;
};

interface PulledPiece {
  piece: PieceType;
  nextQueue: PieceType[];
  nextIndex: number;
}

function drawPieces(seed: number, count: number): PieceType[] {
  const bag = createSevenBag(createSeededRng(seed));
  return Array.from({ length: count }, () => bag.next());
}

function withQueueMeta(state: GameState, seed: number, nextIndex: number): InternalGameState {
  return {
    ...state,
    seed,
    nextIndex
  };
}

function getSeed(state: GameState): number {
  return (state as Partial<InternalGameState>).seed ?? 0;
}

function getNextIndex(state: GameState): number {
  return (state as Partial<InternalGameState>).nextIndex ?? 0;
}

function spawnPiece(type: PieceType): ActivePiece {
  return {
    type,
    position: { x: Math.floor(BOARD_WIDTH / 2) - (type === 'O' ? 1 : 0), y: 1 },
    rotation: 0
  };
}

function createQueue(seed: number, startIndex = 0): PieceType[] {
  return drawPieces(seed, startIndex + VISIBLE_QUEUE_SIZE).slice(startIndex);
}

function pullNext(state: GameState): PulledPiece {
  const seed = getSeed(state);
  const currentIndex = getNextIndex(state);
  const piece = state.nextQueue[0] ?? drawPieces(seed, currentIndex + 1)[currentIndex];
  const nextIndex = currentIndex + 1;

  return {
    piece,
    nextQueue: createQueue(seed, nextIndex),
    nextIndex
  };
}

function scoreLines(linesCleared: number, level: number): number {
  return (SCORE_BY_LINES[linesCleared] ?? 0) * level;
}

function levelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

function lockPiece(state: GameState, dropScore = 0): GameState {
  const merged = mergePiece(state.board, state.active);
  const cleared = clearFullLines(merged);
  const totalLines = state.stats.lines + cleared.linesCleared;
  const stats = {
    score: state.stats.score + dropScore + scoreLines(cleared.linesCleared, state.stats.level),
    lines: totalLines,
    level: levelForLines(totalLines)
  };
  const next = pullNext(state);
  const active = spawnPiece(next.piece);
  const phase = isValidPosition(cleared.board, active) ? 'playing' : 'gameOver';

  return withQueueMeta(
    {
      ...state,
      phase,
      board: cleared.board,
      active,
      nextQueue: next.nextQueue,
      canHold: true,
      stats
    },
    getSeed(state),
    next.nextIndex
  );
}

function moveBy(state: GameState, dx: number, dy: number): GameState {
  const active = {
    ...state.active,
    position: {
      x: state.active.position.x + dx,
      y: state.active.position.y + dy
    }
  };

  if (!isValidPosition(state.board, active)) {
    return state;
  }

  return {
    ...state,
    active
  };
}

function rotateBy(state: GameState, direction: -1 | 1): GameState {
  const active = {
    ...state.active,
    rotation: state.active.rotation + direction
  };

  if (!isValidPosition(state.board, active)) {
    return state;
  }

  return {
    ...state,
    active
  };
}

function hardDrop(state: GameState): GameState {
  let active = state.active;
  let distance = 0;

  while (
    isValidPosition(state.board, {
      ...active,
      position: { ...active.position, y: active.position.y + 1 }
    })
  ) {
    active = {
      ...active,
      position: { ...active.position, y: active.position.y + 1 }
    };
    distance += 1;
  }

  return lockPiece({ ...state, active }, distance * 2);
}

export function createInitialState(seed = Date.now()): GameState {
  const firstPieces = drawPieces(seed, VISIBLE_QUEUE_SIZE + 1);

  return withQueueMeta(
    {
      phase: 'ready',
      board: createEmptyBoard(),
      active: spawnPiece(firstPieces[0]),
      hold: null,
      canHold: true,
      nextQueue: firstPieces.slice(1),
      stats: {
        score: 0,
        level: 1,
        lines: 0
      }
    },
    seed,
    1
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') {
    return createInitialState(getSeed(state));
  }

  if (action.type === 'start' && state.phase === 'ready') {
    return {
      ...state,
      phase: 'playing'
    };
  }

  if (action.type === 'pause' && state.phase === 'playing') {
    return {
      ...state,
      phase: 'paused'
    };
  }

  if (action.type === 'resume' && state.phase === 'paused') {
    return {
      ...state,
      phase: 'playing'
    };
  }

  if (state.phase !== 'playing') {
    return state;
  }

  switch (action.type) {
    case 'tick': {
      const moved = moveBy(state, 0, 1);
      return moved === state ? lockPiece(state) : moved;
    }
    case 'move':
      return moveBy(state, action.dx, 0);
    case 'softDrop': {
      const moved = moveBy(state, 0, 1);
      return moved === state
        ? lockPiece(state)
        : {
            ...moved,
            stats: {
              ...moved.stats,
              score: moved.stats.score + 1
            }
          };
    }
    case 'hardDrop':
      return hardDrop(state);
    case 'rotate':
      return rotateBy(state, action.direction);
    case 'hold': {
      if (!state.canHold) {
        return state;
      }

      if (state.hold === null) {
        const next = pullNext(state);
        const active = spawnPiece(next.piece);
        return withQueueMeta(
          {
            ...state,
            active,
            hold: state.active.type,
            canHold: false,
            nextQueue: next.nextQueue,
            phase: isValidPosition(state.board, active) ? 'playing' : 'gameOver'
          },
          getSeed(state),
          next.nextIndex
        );
      }

      const active = spawnPiece(state.hold);
      return {
        ...state,
        active,
        hold: state.active.type,
        canHold: false,
        phase: isValidPosition(state.board, active) ? 'playing' : 'gameOver'
      };
    }
    default:
      return state;
  }
}

export { getGravityMs };
