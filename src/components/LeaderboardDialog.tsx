import { readScores } from '../storage/leaderboard';
import { Dialog } from './Dialog';

interface LeaderboardDialogProps {
  open: boolean;
  refreshKey: number;
  onClose: () => void;
}

export function LeaderboardDialog({ open, refreshKey, onClose }: LeaderboardDialogProps) {
  const scores = readScores();
  void refreshKey;

  return (
    <Dialog title="Local Leaderboard" open={open} onClose={onClose}>
      {scores.length === 0 ? (
        <p className="muted">No scores yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {scores.map((score) => (
            <li key={`${score.createdAt}-${score.score}`}>
              <strong>{score.score}</strong>
              <span>Level {score.level}</span>
              <span>{score.lines} lines</span>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
