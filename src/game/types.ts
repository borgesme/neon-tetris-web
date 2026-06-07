export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type GamePhase = 'ready' | 'playing' | 'paused' | 'gameOver';
export type Cell = PieceType | null;
export type Board = Cell[][];

export interface Point {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  position: Point;
  rotation: number;
}

export interface GameStats {
  score: number;
  level: number;
  lines: number;
}

export interface GameState {
  phase: GamePhase;
  board: Board;
  active: ActivePiece;
  hold: PieceType | null;
  canHold: boolean;
  nextQueue: PieceType[];
  /** Seed used for the deterministic seven-bag piece stream. */
  bagSeed: number;
  /** Stream index for the next piece to append to nextQueue. */
  nextIndex: number;
  stats: GameStats;
}

export type GameAction =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'softDrop' }
  | { type: 'hardDrop' }
  | { type: 'rotate'; direction: -1 | 1 }
  | { type: 'hold' };
