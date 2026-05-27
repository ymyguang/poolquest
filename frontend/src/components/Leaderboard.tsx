import { Trophy } from 'lucide-react';
import type { QuestState } from '../lib/demoEngine';

const baseRows = [
  { player: '0x74A2...98b1', score: 1830, status: 'cleared' },
  { player: '0x41d9...f3C2', score: 1560, status: 'cleared' },
  { player: '0x8bE0...7719', score: 1215, status: 'hinted' }
];

export function Leaderboard({ state }: { state: QuestState }) {
  const rows = state.completed
    ? [{ player: 'You', score: state.score + state.hintPenalty + state.cursePenalty, status: 'live demo' }, ...baseRows]
    : baseRows;

  return (
    <section className="leaderboard">
      <div className="panel-heading">
        <span>Season board</span>
        <Trophy size={18} />
      </div>
      {rows.map((row, index) => (
        <div className="board-row" key={`${row.player}-${index}`}>
          <span>#{index + 1}</span>
          <strong>{row.player}</strong>
          <em>{row.status}</em>
          <b>{row.score}</b>
        </div>
      ))}
    </section>
  );
}
