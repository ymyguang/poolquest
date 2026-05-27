import { Coins, Droplets, Hourglass, RotateCcw, Shield, Sparkles, Sword, Undo2, WalletCards } from 'lucide-react';
import type { PublicQuest, QuestAction, QuestState } from '../lib/demoEngine';

type Props = {
  quest: PublicQuest | null;
  state: QuestState;
  onAction: (action: QuestAction) => void;
  onStart: () => void;
  onResetView: () => void;
  busy: boolean;
};

const icons: Record<QuestAction, typeof Droplets> = {
  donate: Droplets,
  addLp: Shield,
  removeLp: Undo2,
  buy: Coins,
  sell: Sword,
  hold: Hourglass
};

export function ActionPanel({ quest, state, onAction, onStart, onResetView, busy }: Props) {
  return (
    <section className="control-panel">
      <div className="panel-heading">
        <span>Try AMM actions</span>
        <button className="icon-button" type="button" onClick={onResetView} aria-label="Reset local view">
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="action-grid">
        <button type="button" className="action-button enter" disabled={state.active || busy} onClick={onStart}>
          <WalletCards size={20} />
          <span>Enter Run</span>
          <small>loads hidden Hook rule</small>
        </button>
        {(quest?.actions || []).map((action) => {
          const Icon = icons[action.id];
          return (
            <button
              type="button"
              className="action-button"
              disabled={!state.active || state.completed || busy}
              onClick={() => onAction(action.id)}
              key={action.id}
            >
              <Icon size={20} />
              <span>{action.label}</span>
              <small>{action.lore}</small>
            </button>
          );
        })}
      </div>
      <button type="button" className="wide-button" disabled={state.active || busy} onClick={onStart}>
        <Sparkles size={18} />
        Start Blind Trial
      </button>
    </section>
  );
}
