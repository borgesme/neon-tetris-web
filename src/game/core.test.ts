import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from './constants';
import { createSeededRng, createSevenBag } from './random';

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
