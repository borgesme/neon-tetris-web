import type { ScoreEntry } from '../storage/leaderboard';

export function formatScoreShare(entry: ScoreEntry): string {
  return `I scored ${entry.score} in Neon Tetris at level ${entry.level} with ${entry.lines} lines cleared.`;
}

export async function shareScore(entry: ScoreEntry): Promise<'shared' | 'copied' | 'unsupported'> {
  const text = formatScoreShare(entry);
  const shareNavigator = typeof navigator === 'undefined' ? undefined : navigator;

  if (shareNavigator?.share) {
    try {
      await shareNavigator.share({ text });
      return 'shared';
    } catch {
      // Fall through to clipboard if native sharing is unavailable at runtime.
    }
  }

  if (shareNavigator?.clipboard?.writeText) {
    try {
      await shareNavigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}
