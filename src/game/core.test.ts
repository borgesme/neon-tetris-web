import { describe, expect, it, vi } from 'vitest';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PIECE_TYPES,
  TETROMINOES,
  VISIBLE_QUEUE_SIZE
} from './constants';
import { createSeededRng, createSevenBag } from './random';
import type { ActivePiece, Board } from './types';
import {
  clearFullLines,
  createEmptyBoard,
  getPieceCells,
  isValidPosition,
  mergePiece
} from './board';
import { createInitialState, gameReducer } from './rules';
import { getGhostPiece } from './selectors';

describe('game constants', () => {
  it('uses a standard 10x20 board', () => {
    expect(BOARD_WIDTH).toBe(10);
    expect(BOARD_HEIGHT).toBe(20);
  });

  it('defines all seven tetrominoes', () => {
    expect(Object.keys(TETROMINOES).sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });
});

describe('seven bag randomizer', () => {
  it('returns every tetromino once before repeating', () => {
    const bag = createSevenBag(createSeededRng(42));
    const firstSeven = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(firstSeven).size).toBe(7);
    expect(firstSeven.sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it('is deterministic for the same seed', () => {
    const a = createSevenBag(createSeededRng(7));
    const b = createSevenBag(createSeededRng(7));
    expect(Array.from({ length: 12 }, () => a.next())).toEqual(
      Array.from({ length: 12 }, () => b.next())
    );
  });
});

describe('board operations', () => {
  it('creates an empty board', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(20);
    expect(board.every((row) => row.length === 10)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it('detects collision with walls', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'I', position: { x: 0, y: 1 }, rotation: 0 };
    expect(isValidPosition(board, piece)).toBe(false);
  });

  it('merges a piece into a new board', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'O', position: { x: 4, y: 0 }, rotation: 0 };
    const merged = mergePiece(board, piece);
    expect(merged[0][4]).toBe('O');
    expect(board[0][4]).toBeNull();
  });

  it('ignores horizontally out-of-bounds cells when merging', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'I', position: { x: 0, y: 0 }, rotation: 0 };
    const merged = mergePiece(board, piece);
    expect(Object.prototype.hasOwnProperty.call(merged[0], '-1')).toBe(false);
  });

  it('clears full lines and inserts empty rows at the top', () => {
    const board: Board = createEmptyBoard();
    board[19] = Array.from({ length: 10 }, () => 'T');
    const result = clearFullLines(board);
    expect(result.linesCleared).toBe(1);
    expect(result.board[0].every((cell) => cell === null)).toBe(true);
    expect(result.board[19].every((cell) => cell === null)).toBe(true);
  });

  it('clones surviving rows when clearing full lines', () => {
    const board: Board = createEmptyBoard();
    board[18][0] = 'I';
    board[19] = Array.from({ length: 10 }, () => 'T');
    const result = clearFullLines(board);
    result.board[19][0] = 'O';
    expect(board[18][0]).toBe('I');
  });

  it('computes a ghost piece landing position', () => {
    const board = createEmptyBoard();
    const active: ActivePiece = { type: 'O', position: { x: 4, y: 0 }, rotation: 0 };
    const ghost = getGhostPiece(board, active);
    expect(ghost.position.y).toBe(18);
  });
});

describe('piece cells', () => {
  it('maps local tetromino points to board cells', () => {
    const piece: ActivePiece = { type: 'O', position: { x: 4, y: 3 }, rotation: 0 };
    expect(getPieceCells(piece)).toEqual([
      { x: 4, y: 3, type: 'O' },
      { x: 5, y: 3, type: 'O' },
      { x: 4, y: 4, type: 'O' },
      { x: 5, y: 4, type: 'O' }
    ]);
  });

  it('normalizes negative rotations', () => {
    const piece: ActivePiece = { type: 'L', position: { x: 4, y: 4 }, rotation: -1 };
    expect(getPieceCells(piece)).toEqual([
      { x: 3, y: 3, type: 'L' },
      { x: 4, y: 3, type: 'L' },
      { x: 4, y: 4, type: 'L' },
      { x: 4, y: 5, type: 'L' }
    ]);
  });
});

describe('game reducer rules', () => {
  it('starts ready and moves to playing', () => {
    const state = createInitialState(1);

    expect(state.phase).toBe('ready');
    expect(gameReducer(state, { type: 'start' }).phase).toBe('playing');
  });

  it('moves the active piece left when valid', () => {
    const playing = gameReducer(createInitialState(1), { type: 'start' });
    const moved = gameReducer(playing, { type: 'move', dx: -1 });

    expect(moved.active.position.x).toBe(playing.active.position.x - 1);
  });

  it('hard drops with score and refreshes hold permission', () => {
    const playing = gameReducer(createInitialState(1), { type: 'start' });
    const held = gameReducer(playing, { type: 'hold' });
    const dropped = gameReducer(held, { type: 'hardDrop' });

    expect(dropped.stats.score).toBeGreaterThan(held.stats.score);
    expect(dropped.canHold).toBe(true);
  });

  it('allows hold once before locking', () => {
    const playing = gameReducer(createInitialState(1), { type: 'start' });
    const held = gameReducer(playing, { type: 'hold' });
    const heldAgain = gameReducer(held, { type: 'hold' });

    expect(held.hold).toBe(playing.active.type);
    expect(held.canHold).toBe(false);
    expect(heldAgain).toBe(held);
  });

  it('pauses and resumes without changing the board', () => {
    const playing = gameReducer(createInitialState(1), { type: 'start' });
    const paused = gameReducer(playing, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });

    expect(paused.phase).toBe('paused');
    expect(resumed.phase).toBe('playing');
    expect(paused.board).toBe(playing.board);
    expect(resumed.board).toBe(playing.board);
  });

  it('uses only the public game state shape', () => {
    expect(Object.keys(createInitialState(1)).sort()).toEqual([
      'active',
      'bagSeed',
      'board',
      'canHold',
      'hold',
      'nextIndex',
      'nextQueue',
      'phase',
      'stats',
      'stream'
    ]);
  });

  it('records deterministic queue stream metadata publicly', () => {
    const state = createInitialState(1);

    expect(state.bagSeed).toBe(1);
    expect(state.nextIndex).toBe(VISIBLE_QUEUE_SIZE + 1);
    expect(state.nextQueue).toHaveLength(VISIBLE_QUEUE_SIZE);
  });

  it('keeps a serializable seven-bag stream state for incremental queue refills', () => {
    const state = createInitialState(1);

    expect(Object.keys(state.stream).sort()).toEqual(['bag', 'rngState']);
    expect(typeof state.stream.rngState).toBe('number');
    expect(state.stream.bag.every((piece) => PIECE_TYPES.includes(piece))).toBe(true);
  });

  it('restarts as a fresh playing game with reset stats', () => {
    const played = {
      ...gameReducer(createInitialState(1), { type: 'start' }),
      stats: { score: 1200, lines: 14, level: 2 }
    };
    const restarted = gameReducer(played, { type: 'restart' });

    expect(restarted.phase).toBe('playing');
    expect(restarted.stats).toEqual({ score: 0, lines: 0, level: 1 });
  });

  it('rotates near a wall by applying a horizontal kick', () => {
    const playing = {
      ...gameReducer(createInitialState(1), { type: 'start' }),
      active: { type: 'I' as const, position: { x: -1, y: 2 }, rotation: 1 }
    };
    const rotated = gameReducer(playing, { type: 'rotate', direction: 1 });

    expect(rotated.active.position.x).toBe(1);
    expect(rotated.active.rotation).toBe(2);
  });

  it('uses SRS vertical kick order when rotating around blockers', () => {
    const board = createEmptyBoard();
    board[2][4] = 'O';
    board[1][4] = 'O';
    const playing = {
      ...gameReducer(createInitialState(1), { type: 'start' }),
      board,
      active: { type: 'T' as const, position: { x: 4, y: 1 }, rotation: 0 }
    };

    const rotated = gameReducer(playing, { type: 'rotate', direction: 1 });

    expect(rotated.active.position).toEqual({ x: 3, y: 0 });
    expect(rotated.active.rotation).toBe(1);
  });

  it('normalizes stored rotation values', () => {
    const playing = gameReducer(createInitialState(1), { type: 'start' });
    const rotated = gameReducer(playing, { type: 'rotate', direction: -1 });

    expect(rotated.active.rotation).toBe(3);
  });

  it('keeps matching seeds deterministic through identical hard drop, hold, and tick actions', () => {
    const now = vi.spyOn(Date, 'now').mockImplementation(() => 1000);
    const actions = [
      { type: 'start' },
      { type: 'hold' },
      { type: 'hardDrop' },
      { type: 'tick' },
      { type: 'hardDrop' },
      { type: 'hardDrop' }
    ] as const;

    const first = actions.reduce(gameReducer, createInitialState(7));
    const second = actions.reduce(gameReducer, createInitialState(7));
    now.mockRestore();

    expect({
      active: first.active,
      nextQueue: first.nextQueue,
      stats: first.stats,
      phase: first.phase
    }).toEqual({
      active: second.active,
      nextQueue: second.nextQueue,
      stats: second.stats,
      phase: second.phase
    });
  });

  it('progresses the queue deterministically after enough locks without time refill', () => {
    const now = vi.spyOn(Date, 'now').mockImplementation(() => 2000);
    const lockActions = Array.from({ length: VISIBLE_QUEUE_SIZE + 3 }, () => ({
      type: 'hardDrop' as const
    }));

    const first = lockActions.reduce(
      gameReducer,
      gameReducer(createInitialState(11), { type: 'start' })
    );
    now.mockClear();
    const second = lockActions.reduce(
      gameReducer,
      gameReducer(createInitialState(11), { type: 'start' })
    );
    const dateCalls = now.mock.calls.length;
    now.mockRestore();

    expect(dateCalls).toBe(0);
    expect(first.active).toEqual(second.active);
    expect(first.nextQueue).toEqual(second.nextQueue);
    expect(first.nextIndex).toBe(second.nextIndex);
  });
});
