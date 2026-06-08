import { describe, expect, test } from 'vitest';
import { syncCanvasBackingStore } from './GameCanvas';

describe('GameCanvas backing store', () => {
  test('updates canvas dimensions only when the backing size changes', () => {
    const canvas = { width: 200, height: 400 };

    expect(syncCanvasBackingStore(canvas, 200, 400)).toBe(false);
    expect(canvas).toEqual({ width: 200, height: 400 });

    expect(syncCanvasBackingStore(canvas, 250, 500)).toBe(true);
    expect(canvas).toEqual({ width: 250, height: 500 });
  });
});
