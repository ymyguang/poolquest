import { Activity, BadgeCheck, Banknote, Gem, Trophy } from 'lucide-react';
import type { QuestState } from '../lib/demoEngine';

export function StatsPanel({ state }: { state: QuestState }) {
  const rows = [
    { label: 'QUSD', value: state.qusd.toFixed(2), icon: Banknote },
    { label: 'DRAGON', value: state.dragon.toFixed(2), icon: Gem },
    { label: 'Progress', value: `${state.progress}/5`, icon: BadgeCheck },
    { label: 'Actions', value: String(state.actionCount), icon: Activity },
    { label: 'Score', value: String(state.score + state.hintPenalty + state.cursePenalty), icon: Trophy }
  ];

  return (
    <section className="stats-grid">
      {rows.map(({ label, value, icon: Icon }) => (
        <div className="stat-tile" key={label}>
          <Icon size={18} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
