import { useEffect, useState } from 'react';
import { WalletBar } from './components/WalletBar';
import { QuestPath } from './components/QuestPath';
import { ActionPanel } from './components/ActionPanel';
import { AgentPanel } from './components/AgentPanel';
import { StatsPanel } from './components/StatsPanel';
import { Leaderboard } from './components/Leaderboard';
import { ContractPanel } from './components/ContractPanel';
import { connectWallet, emptyWallet, switchToXLayer, type WalletState } from './lib/wallet';
import { DEMO_HOLD_SECONDS, emptyQuestState, stepStatuses, type PublicQuest, type QuestAction } from './lib/demoEngine';
import { askHint, fetchQuest, startRun, submitAction } from './lib/api';

function App() {
  const [wallet, setWallet] = useState<WalletState>(emptyWallet);
  const [publicQuest, setPublicQuest] = useState<PublicQuest | null>(null);
  const [quest, setQuest] = useState(emptyQuestState);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchQuest()
      .then(({ quest: nextQuest }) => {
        setPublicQuest(nextQuest);
        setQuest((current) => ({
          ...current,
          feedback: nextQuest.openingProphecy,
          log: ['Opening prophecy loaded. Hidden solution stayed in backend.'],
          stageStatuses: nextQuest.publicStages.map(() => 'locked')
        }));
      })
      .catch((error: unknown) => {
        setApiError(error instanceof Error ? error.message : 'PoolQuest backend unavailable');
      });
  }, []);

  const withBusy = async (task: () => Promise<void>) => {
    setBusy(true);
    setApiError('');
    try {
      await task();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'PoolQuest action failed');
    } finally {
      setBusy(false);
    }
  };

  const onStart = () => {
    void withBusy(async () => {
      const { run } = await startRun();
      setQuest(run);
    });
  };

  const onAction = (action: QuestAction) => {
    if (!quest.id) return;
    void withBusy(async () => {
      const { run } = await submitAction(quest.id, action);
      setQuest(run);
    });
  };

  const onHint = (level: 1 | 2 | 3) => {
    if (!quest.id) return;
    void withBusy(async () => {
      const { run } = await askHint(quest.id, level);
      setQuest(run);
    });
  };

  const resetView = () => {
    setQuest((current) => ({
      ...emptyQuestState(),
      feedback: publicQuest?.openingProphecy || current.feedback,
      log: ['Local view reset. Backend hidden quest unchanged.'],
      stageStatuses: publicQuest?.publicStages.map(() => 'locked') || current.stageStatuses
    }));
  };

  const connect = async () => {
    setWallet(await connectWallet());
  };

  const switchNetwork = async () => {
    await switchToXLayer();
    setWallet(await connectWallet());
  };

  return (
    <main className="app-shell">
      <WalletBar wallet={wallet} onConnect={connect} onSwitch={switchNetwork} />

      <section className="hero-grid">
        <div className="trial-stage">
          <div className="trial-copy">
            <p className="eyebrow">{publicQuest?.theme || 'Dragon Pool'} · {publicQuest?.poolPair || 'DRAGON / QUSD'}</p>
            <h2>Creator prompts the Agent. Hook hides the answer.</h2>
            <p>{publicQuest?.openingProphecy || 'Loading prophecy from backend...'}</p>
          </div>
          <QuestPath stages={publicQuest?.publicStages || ['?', '?', '?', '?', '?']} statuses={stepStatuses(quest)} />
        </div>
        <StatsPanel state={quest} />
      </section>

      <section className="workspace-grid">
        <ActionPanel quest={publicQuest} state={quest} onAction={onAction} onStart={onStart} onResetView={resetView} busy={busy} />
        <AgentPanel state={quest} onHint={onHint} busy={busy} />
      </section>

      <section className="lower-grid">
        <Leaderboard state={quest} />
        <ContractPanel />
        <div className="rules-strip">
          {apiError ? <span>Backend: {apiError}</span> : <span>Hidden path stored server-side</span>}
          <span>Run limit 15m</span>
          <span>Entry 1 QUSD</span>
          <span>Hook fee 0.05%</span>
          <span>Hold {DEMO_HOLD_SECONDS}s demo / 180s chain</span>
        </div>
      </section>
    </main>
  );
}

export default App;
