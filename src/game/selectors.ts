import { isValidPosition } from './board';
import type { ActivePiece, Board } from './types';

export function getGhostPiece(board: Board, active: ActivePiece): ActivePiece {
  let ghost = active;
  while (
    isValidPosition(board, { ...ghost, position: { ...ghost.position, y: ghost.position.y + 1 } })
  ) {
    ghost = { ...ghost, position: { ...ghost.position, y: ghost.position.y + 1 } };
  }
  return ghost;
}
