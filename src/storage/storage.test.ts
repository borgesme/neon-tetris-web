import { afterEach, describe, expect, test, vi } from 'vitest';

type LeaderboardModule = typeof import('./leaderboard');
type SettingsModule = typeof import('./settings');
type ShareScoreModule = typeof import('../share/shareScore');

async function loadStorageModules(): Promise<{
  leaderboard: LeaderboardModule;
  settings: SettingsModule;
}> {
  vi.resetModules();
  const [leaderboard, settings] = await Promise.all([import('./leaderboard'), import('./settings')]);
  return { leaderboard, settings };
}

async function loadShareScoreModule(): Promise<ShareScoreModule> {
  vi.resetModules();
  return import('../share/shareScore');
}

describe('storage adapters', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('leaderboard keeps scores sorted descending after addScore calls', async () => {
    const { leaderboard } = await loadStorageModules();
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

    leaderboard.addScore(lowScore);
    leaderboard.addScore(highScore);
    leaderboard.addScore(midScore);

    expect(leaderboard.readScores().map((entry) => entry.score)).toEqual([9800, 4300, 1200]);
  });

  test('readScores returns [] if stored data is invalid JSON', async () => {
    const { leaderboard } = await loadStorageModules();

    localStorage.setItem('tetris:leaderboard', '{not-json');

    expect(leaderboard.readScores()).toEqual([]);
  });

  test('settings persist theme/sound and invalid data falls back to defaults', async () => {
    const { settings } = await loadStorageModules();

    settings.writeSettings({ theme: 'neon', soundEnabled: false, volume: 0.45 });

    expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: false, volume: 0.45 });

    localStorage.setItem('tetris:settings', '{"theme":"retro","soundEnabled":"yes"}');

    expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: true, volume: 0.7 });
  });

  test('settings migrate missing volume and reject invalid volume values', async () => {
    const { settings } = await loadStorageModules();

    localStorage.setItem('tetris:settings', '{"theme":"neon","soundEnabled":false}');

    expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: false, volume: 0.7 });

    localStorage.setItem('tetris:settings', '{"theme":"neon","soundEnabled":false,"volume":2}');

    expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: true, volume: 0.7 });
  });

  test('addScore does not throw when localStorage.setItem fails', async () => {
    const { leaderboard } = await loadStorageModules();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() =>
      leaderboard.addScore({
        score: 500,
        level: 1,
        lines: 4,
        createdAt: '2026-06-08T00:03:00.000Z'
      })
    ).not.toThrow();
  });

  test('leaderboard returns fresh memory value when a write fails over stale stored scores', async () => {
    const { leaderboard } = await loadStorageModules();

    localStorage.setItem(
      'tetris:leaderboard',
      JSON.stringify([
        {
          score: 100,
          level: 1,
          lines: 2,
          createdAt: '2026-06-08T00:04:00.000Z'
        }
      ])
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    leaderboard.addScore({
      score: 900,
      level: 4,
      lines: 20,
      createdAt: '2026-06-08T00:05:00.000Z'
    });

    expect(leaderboard.readScores().map((entry) => entry.score)).toEqual([900, 100]);
  });

  test('settings return fresh memory value when a write fails over stale stored settings', async () => {
    const { settings } = await loadStorageModules();

    localStorage.setItem(
      'tetris:settings',
      JSON.stringify({ theme: 'neon', soundEnabled: true, volume: 0.7 })
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    settings.writeSettings({ theme: 'neon', soundEnabled: false, volume: 0.2 });

    expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: false, volume: 0.2 });
  });

  test('shareScore returns unsupported without navigator', async () => {
    vi.stubGlobal('navigator', undefined);
    const { shareScore } = await loadShareScoreModule();

    await expect(
      shareScore({
        score: 700,
        level: 3,
        lines: 14,
        createdAt: '2026-06-08T00:06:00.000Z'
      })
    ).resolves.toBe('unsupported');
  });

  test('module reset isolates memory fallback state between tests', async () => {
    const firstLoad = await loadStorageModules();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    firstLoad.leaderboard.addScore({
      score: 300,
      level: 2,
      lines: 6,
      createdAt: '2026-06-08T00:07:00.000Z'
    });
    firstLoad.settings.writeSettings({ theme: 'neon', soundEnabled: false, volume: 0.3 });
    expect(firstLoad.leaderboard.readScores().map((entry) => entry.score)).toEqual([300]);
    expect(firstLoad.settings.readSettings()).toEqual({
      theme: 'neon',
      soundEnabled: false,
      volume: 0.3
    });

    vi.restoreAllMocks();
    localStorage.clear();

    const secondLoad = await loadStorageModules();

    expect(secondLoad.leaderboard.readScores()).toEqual([]);
    expect(secondLoad.settings.readSettings()).toEqual({
      theme: 'neon',
      soundEnabled: true,
      volume: 0.7
    });
  });
});
