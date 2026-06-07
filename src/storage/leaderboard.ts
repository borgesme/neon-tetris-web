export interface ScoreEntry {
  score: number;
  level: number;
  lines: number;
  createdAt: string;
}

const LEADERBOARD_KEY = 'tetris:leaderboard';
const MAX_SCORES = 10;

let memoryScores: ScoreEntry[] = [];
let useMemoryFallback = false;

function isScoreEntry(value: unknown): value is ScoreEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as ScoreEntry;
  return (
    typeof entry.score === 'number' &&
    typeof entry.level === 'number' &&
    typeof entry.lines === 'number' &&
    typeof entry.createdAt === 'string'
  );
}

function normalizeScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((left, right) => right.score - left.score).slice(0, MAX_SCORES);
}

export function readScores(): ScoreEntry[] {
  let storedScores: string | null;

  try {
    storedScores = localStorage.getItem(LEADERBOARD_KEY);
  } catch {
    return [...memoryScores];
  }

  if (storedScores === null) {
    return useMemoryFallback ? [...memoryScores] : [];
  }

  try {
    const parsedScores: unknown = JSON.parse(storedScores);
    if (!Array.isArray(parsedScores)) {
      return [];
    }

    return normalizeScores(parsedScores.filter(isScoreEntry));
  } catch {
    return [];
  }
}

export function writeScores(scores: ScoreEntry[]): void {
  const normalizedScores = normalizeScores(scores);
  memoryScores = normalizedScores;

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(normalizedScores));
    useMemoryFallback = false;
  } catch {
    useMemoryFallback = true;
    // Keep the in-memory fallback updated when storage writes are blocked.
  }
}

export function addScore(score: ScoreEntry): ScoreEntry[] {
  const scores = normalizeScores([...readScores(), score]);
  writeScores(scores);
  return scores;
}
