import { PIECE_TYPES } from './constants';
import type { PieceStreamState, PieceType } from './types';

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    const next = nextSeededRandom(state);
    state = next.state;
    return next.value;
  };
}

export function nextSeededRandom(state: number): { state: number; value: number } {
  const nextState = (state * 1664525 + 1013904223) >>> 0;
  return {
    state: nextState,
    value: nextState / 0x100000000
  };
}

export function createPieceStream(seed: number): PieceStreamState {
  return {
    rngState: seed >>> 0,
    bag: []
  };
}

function refillStream(stream: PieceStreamState): PieceStreamState {
  const bag = [...PIECE_TYPES];
  let rngState = stream.rngState;

  for (let i = bag.length - 1; i > 0; i -= 1) {
    const next = nextSeededRandom(rngState);
    rngState = next.state;
    const j = Math.floor(next.value * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  return {
    rngState,
    bag
  };
}

export function drawPieceFromStream(stream: PieceStreamState): {
  piece: PieceType;
  stream: PieceStreamState;
} {
  const readyStream = stream.bag.length === 0 ? refillStream(stream) : stream;
  const nextBag = [...readyStream.bag];
  const piece = nextBag.pop()!;

  return {
    piece,
    stream: {
      rngState: readyStream.rngState,
      bag: nextBag
    }
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
