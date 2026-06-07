import { PIECE_TYPES } from './constants';
import type { PieceType } from './types';

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createSevenBag(rng: Rng = Math.random) {
  let bag: PieceType[] = [];

  function refill() {
    bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  return {
    next(): PieceType {
      if (bag.length === 0) {
        refill();
      }
      return bag.pop()!;
    }
  };
}
