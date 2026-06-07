import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from './constants';
import { createSeededRng, createSevenBag } from './random';
import type { ActivePiece, Board } from './types';
import {
  clearFullLines,
  createEmptyBoard,
  getPieceCells,
  isValidPosition,
  mergePiece
} from './board';
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
