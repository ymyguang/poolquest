import { MessageCircle, Send } from 'lucide-react';
import { hintQuote, type QuestState } from '../lib/demoEngine';

type Props = {
  state: QuestState;
  onHint: (level: 1 | 2 | 3) => void;
  busy: boolean;
};

export function AgentPanel({ state, onHint, busy }: Props) {
  return (
    <section className="agent-panel">
      <div className="panel-heading">
        <span>Dragon Agent</span>
        <MessageCircle size={18} />
      </div>
      <blockquote>{state.feedback}</blockquote>
      <div className="hint-row">
        {[1, 2, 3].map((level) => {
          const quote = hintQuote(state, level as 1 | 2 | 3);
          return (
            <button
              key={level}
              type="button"
              className="hint-button"
              disabled={!state.active || state.completed || busy}
              onClick={() => onHint(level as 1 | 2 | 3)}
            >
              <Send size={15} />
              <span>Lv {level}</span>
              <small>{quote.fee.toFixed(2)} DRAGON / -{quote.penalty}</small>
            </button>
          );
        })}
      </div>
      <div className="agent-log">
        {state.log.map((entry, index) => (
          <p key={`${entry}-${index}`}>{entry}</p>
        ))}
      </div>
    </section>
  );
}
