import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from './constants';
import type { ActivePiece, Board, Cell, PieceType } from './types';

export interface RenderCell {
  x: number;
  y: number;
  type: PieceType;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));
}

export function getPieceCells(piece: ActivePiece): RenderCell[] {
  const rotation = ((piece.rotation % 4) + 4) % 4;
  return TETROMINOES[piece.type][rotation].map((point) => ({
    x: piece.position.x + point.x,
    y: piece.position.y + point.y,
    type: piece.type
  }));
}

export function isValidPosition(board: Board, piece: ActivePiece): boolean {
  return getPieceCells(piece).every((cell) => {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) {
      return false;
    }
    if (cell.y < 0) {
      return true;
    }
    return board[cell.y][cell.x] === null;
  });
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const next = board.map((row) => [...row]);
  for (const cell of getPieceCells(piece)) {
    if (cell.x >= 0 && cell.x < BOARD_WIDTH && cell.y >= 0 && cell.y < BOARD_HEIGHT) {
      next[cell.y][cell.x] = cell.type;
    }
  }
  return next;
}

export function clearFullLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null)).map((row) => [...row]);
  const linesCleared = BOARD_HEIGHT - remaining.length;
  const emptyRows = Array.from({ length: linesCleared }, () => Array<Cell>(BOARD_WIDTH).fill(null));
  return {
    board: [...emptyRows, ...remaining],
    linesCleared
  };
}
