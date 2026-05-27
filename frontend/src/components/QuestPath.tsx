import { Check, Flame, Lock, Star } from 'lucide-react';
import type { StepStatus } from '../lib/demoEngine';

const iconFor = (status: StepStatus) => {
  if (status === 'complete') return <Star size={18} />;
  if (status === 'done') return <Check size={18} />;
  if (status === 'danger') return <Flame size={18} />;
  return <Lock size={18} />;
};

export function QuestPath({ stages, statuses }: { stages: string[]; statuses: StepStatus[] }) {
  return (
    <section className="path-band" aria-label="Dragon Trial progress">
      {stages.map((title, index) => (
        <div className="path-node" key={`${title}-${index}`}>
          <div className={`path-orb ${statuses[index]}`}>{iconFor(statuses[index])}</div>
          <div>
            <strong>{title}</strong>
            <span>符文 {index + 1}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
