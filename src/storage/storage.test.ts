import { afterEach, describe, expect, test, vi } from 'vitest';
import { addScore, readScores } from './leaderboard';
import { readSettings, writeSettings } from './settings';

describe('storage adapters', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('leaderboard keeps scores sorted descending after addScore calls', () => {
    const lowScore = {
      score: 1200,
      level: 2,
      lines: 8,
      createdAt: '2026-06-08T00:00:00.000Z'
    };
    const highScore = {
      score: 9800,
      level: 9,
      lines: 74,
      createdAt: '2026-06-08T00:01:00.000Z'
    };
    const midScore = {
      score: 4300,
      level: 5,
      lines: 31,
      createdAt: '2026-06-08T00:02:00.000Z'
    };

    addScore(lowScore);
    addScore(highScore);
    addScore(midScore);

    expect(readScores().map((entry) => entry.score)).toEqual([9800, 4300, 1200]);
  });

  test('readScores returns [] if stored data is invalid JSON', () => {
    localStorage.setItem('tetris:leaderboard', '{not-json');

    expect(readScores()).toEqual([]);
  });

  test('settings persist theme/sound and invalid data falls back to defaults', () => {
    writeSettings({ theme: 'neon', soundEnabled: false });

    expect(readSettings()).toEqual({ theme: 'neon', soundEnabled: false });

    localStorage.setItem('tetris:settings', '{"theme":"retro","soundEnabled":"yes"}');

    expect(readSettings()).toEqual({ theme: 'neon', soundEnabled: true });
  });

  test('addScore does not throw when localStorage.setItem fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() =>
      addScore({
        score: 500,
        level: 1,
        lines: 4,
        createdAt: '2026-06-08T00:03:00.000Z'
      })
    ).not.toThrow();
  });
});
