import { BOARD_WIDTH, SCORE_BY_LINES, VISIBLE_QUEUE_SIZE, getGravityMs } from './constants';
import { clearFullLines, createEmptyBoard, isValidPosition, mergePiece } from './board';
import { createPieceStream, drawPieceFromStream } from './random';
import type { ActivePiece, GameAction, GameState, PieceStreamState, PieceType } from './types';

const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2] as const;

interface PulledPiece {
  piece: PieceType;
  nextQueue: PieceType[];
  nextIndex: number;
  stream: PieceStreamState;
}

function drawPieces(
  stream: PieceStreamState,
  count: number
): { pieces: PieceType[]; stream: PieceStreamState } {
  const pieces: PieceType[] = [];
  let nextStream = stream;

  for (let i = 0; i < count; i += 1) {
    const next = drawPieceFromStream(nextStream);
    pieces.push(next.piece);
    nextStream = next.stream;
  }

  return {
    pieces,
    stream: nextStream
  };
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 4) + 4) % 4;
}

function spawnPiece(type: PieceType): ActivePiece {
  return {
    type,
    position: { x: Math.floor(BOARD_WIDTH / 2) - (type === 'O' ? 1 : 0), y: 1 },
    rotation: 0
  };
}

function pullNext(state: GameState): PulledPiece {
  const hasQueuedPiece = state.nextQueue.length > 0;
  let stream = state.stream;
  const drawn = hasQueuedPiece ? null : drawPieceFromStream(stream);
  const piece = hasQueuedPiece ? state.nextQueue[0] : drawn!.piece;
  stream = drawn?.stream ?? stream;
  const nextQueue = hasQueuedPiece ? state.nextQueue.slice(1) : [];
  let nextIndex = state.nextIndex + (hasQueuedPiece ? 0 : 1);

  while (nextQueue.length < VISIBLE_QUEUE_SIZE) {
    const next = drawPieceFromStream(stream);
    nextQueue.push(next.piece);
    stream = next.stream;
    nextIndex += 1;
  }

  return {
    piece,
    nextQueue,
    nextIndex,
    stream
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

  return {
    ...state,
    phase,
    board: cleared.board,
    active,
    nextQueue: next.nextQueue,
    nextIndex: next.nextIndex,
    stream: next.stream,
    canHold: true,
    stats
  };
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
  const rotation = normalizeRotation(state.active.rotation + direction);

  for (const dx of WALL_KICK_OFFSETS) {
    const active = {
      ...state.active,
      position: {
        ...state.active.position,
        x: state.active.position.x + dx
      },
      rotation
    };

    if (isValidPosition(state.board, active)) {
      return {
        ...state,
        active
      };
    }
  }

  return state;
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
  const initialStream = createPieceStream(seed);
  const initialDraw = drawPieces(initialStream, VISIBLE_QUEUE_SIZE + 1);
  const firstPieces = initialDraw.pieces;

  return {
    phase: 'ready',
    board: createEmptyBoard(),
    active: spawnPiece(firstPieces[0]),
    hold: null,
    canHold: true,
    nextQueue: firstPieces.slice(1),
    bagSeed: seed,
    nextIndex: VISIBLE_QUEUE_SIZE + 1,
    stream: initialDraw.stream,
    stats: {
      score: 0,
      level: 1,
      lines: 0
    }
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') {
    return {
      ...createInitialState(Date.now()),
      phase: 'playing'
    };
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
        return {
          ...state,
          active,
          hold: state.active.type,
          canHold: false,
          nextQueue: next.nextQueue,
          nextIndex: next.nextIndex,
          stream: next.stream,
          phase: isValidPosition(state.board, active) ? 'playing' : 'gameOver'
        };
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
