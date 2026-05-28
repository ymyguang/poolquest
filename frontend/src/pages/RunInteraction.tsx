import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Address, Hash } from 'viem';
import type { WalletState } from '../lib/wallet';
import {
  executeOnChainAction,
  getDemoBalances,
  startOnChainRun,
  txUrl,
  type ChainActionType,
  type DemoBalances
} from '../lib/wallet';
import {
  fetchAgent, startRun, submitAction, purchaseHint,
  getRun, fetchScore, type AgentDetail, type Run,
  type ScoreBreakdown,
} from '../lib/api';

type Message = { role: 'agent' | 'system' | 'player'; text: string };
type ChainTx = { label: string; hash: Hash };

const CHAIN_ACTIONS = new Set<ChainActionType>([
  'swap_buy',
  'swap_sell',
  'add_liquidity',
  'remove_liquidity',
  'donate',
  'hold'
]);

const ACTION_LABELS: Record<string, string> = {
  swap_buy: '买入 DRAGON',
  swap_sell: '卖出 DRAGON',
  add_liquidity: '添加流动性',
  remove_liquidity: '移除流动性',
  donate: '捐赠 QUSD',
  hold: '等待时机'
};

export function RunInteraction({ wallet }: { wallet: WalletState }) {
  const { id: agentId } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [timeLeft, setTimeLeft] = useState(600);
  const [chainTxs, setChainTxs] = useState<ChainTx[]>([]);
  const [balances, setBalances] = useState<DemoBalances | null>(null);

  // Load agent data
  useEffect(() => {
    if (!agentId) return;
    fetchAgent(agentId).then(setAgent).catch(console.error);
  }, [agentId]);

  // Timer
  useEffect(() => {
    if (!run || run.status !== 'active') return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [run?.status]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!wallet.address) return;
    setBalances(await getDemoBalances(wallet.address));
  }, [wallet.address]);

  useEffect(() => {
    refreshBalances().catch(() => {});
  }, [refreshBalances]);

  const onStart = async () => {
    if (!agentId || !agent) return;
    if (!wallet.address) {
      setError('请先连接钱包并切换到 X Layer Testnet。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const txs = await startOnChainRun({
        account: wallet.address,
        agentId,
        creator: agent.agent.creatorAddress as Address,
        totalSteps: profile.visibleStages.length,
        ruleHash: agent.agent.ruleHash
      });
      setChainTxs((prev) => [
        ...prev,
        ...txs.map((hash, index) => ({
          label: index === txs.length - 1 ? '进入试炼' : '链上准备',
          hash
        }))
      ]);

      const r = await startRun(agentId, wallet.address);
      setRun(r);
      setMessages([]);
      setTimeLeft(600);
      // Show opening prophecy
      const detail = await fetchAgent(agentId);
      addMessage({ role: 'agent', text: detail.profile.openingProphecy });
      addMessage({ role: 'system', text: '链上试炼已启动：后续动作会发送到 X Layer Testnet，并由 Hook 记录。' });
      await refreshBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setBusy(false);
    }
  };

  const onAction = async (actionType: string) => {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      addMessage({ role: 'player', text: `> ${actionType}` });
      let txHash: Hash | null = null;
      if (CHAIN_ACTIONS.has(actionType as ChainActionType)) {
        txHash = await executeOnChainAction(wallet.address!, actionType as ChainActionType);
        if (txHash) {
          const confirmedTx = txHash;
          setChainTxs((prev) => [...prev, { label: actionType, hash: confirmedTx }]);
          addMessage({ role: 'system', text: `链上交易已确认：${confirmedTx.slice(0, 10)}...${confirmedTx.slice(-6)}` });
        }
      }
      const result = await submitAction(run.id, actionType, {
        mode: 'onchain'
      }, txHash ?? undefined);
      setRun(result.run);
      addMessage({ role: 'agent', text: result.feedback.message });
      await refreshBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : '动作执行失败');
    } finally {
      setBusy(false);
    }
  };

  const onHint = async () => {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const hint = await purchaseHint(run.id, hintLevel);
      addMessage({ role: 'agent', text: `[提示 ${hintLevel}] ${hint.message}` });
      addMessage({ role: 'system', text: `消耗：${hint.feeQusd} QUSD | 分数惩罚：-${hint.scorePenalty}` });
      // Refresh run state
      const updated = await getRun(run.id);
      setRun(updated);
      await refreshBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提示请求失败');
    } finally {
      setBusy(false);
    }
  };

  // Load score on completion
  useEffect(() => {
    if (run?.status === 'completed' && run.id) {
      fetchScore(run.id).then(setScore).catch(console.error);
    }
  }, [run?.status, run?.id]);

  if (!agent) {
    return <div className="loading">正在加载 Agent...</div>;
  }

  const { profile } = agent;
  const stages = run?.stages ?? profile.visibleStages;
  const stageStatuses = run?.stageStatuses ?? stages.map(() => 'locked');
  const isActive = run?.status === 'active';
  const isCompleted = run?.status === 'completed';
  const isFailed = run?.status === 'failed';

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <section className="run-interaction">
      <Link to={`/agents/${agentId}`} className="back-link">&larr; 返回 Agent</Link>

      <div className="run-layout">
        <div className="run-left">
          <div className="progress-section">
            <h2>{agent.agent.name} 试炼</h2>
            <div className="chain-status-row">
              <span>真实 X Layer Testnet 交易，PoolManager 触发 Hook 记录玩家动作</span>
              {balances && (
                <span>QUSD {balances.qusd} / {agent.agent.tokenSymbol} {balances.dragon}</span>
              )}
            </div>
            <div className="stages-row">
              {stages.map((stage, i) => {
                const status = stageStatuses[i] || 'locked';
                const icon = status === 'done' ? '[✓]'
                  : status === 'completed' ? '[★]'
                  : status === 'current' ? '[?]'
                  : status === 'danger' ? '[!]'
                  : '[ ]';
                return (
                  <div key={i} className={`stage-node status-${status}`}>
                    <span className="stage-icon">{icon}</span>
                    <span className="stage-name">{stage}</span>
                  </div>
                );
              })}
            </div>
            {isActive && (
              <div className="run-timer">
                剩余时间：<span className={timeLeft < 120 ? 'timer-danger' : ''}>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {isCompleted && score && (
            <div className="score-box">
              <h3>试炼完成！总分：{score.totalScore}</h3>
              <div className="score-grid">
                <div>完成度：+{score.completionScore}</div>
                <div>净值：{score.netWorthScore >= 0 ? '+' : ''}{score.netWorthScore}</div>
                <div>时间：+{score.timeScore}</div>
                <div>效率：+{score.efficiencyScore}</div>
                <div>LP：{score.lpContributionScore >= 0 ? '+' : ''}{score.lpContributionScore}</div>
                <div>提示惩罚：-{score.hintPenalty}</div>
                <div>诅咒惩罚：-{score.cursePenalty}</div>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="error-box">试炼失败：时间耗尽或条件未满足。</div>
          )}

          {chainTxs.length > 0 && (
            <div className="chain-tx-box">
              <h3>链上证明</h3>
              <div className="chain-tx-list">
                {chainTxs.slice(-6).map((tx) => (
                  <a key={tx.hash} href={txUrl(tx.hash)} target="_blank" rel="noreferrer">
                    <span>{tx.label}</span>
                    <code>{tx.hash.slice(0, 12)}...{tx.hash.slice(-8)}</code>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="action-section">
            <h3>玩家动作</h3>
            <div className="action-grid">
              {profile.publicActions.map((a) => (
                <button
                  key={a.id}
                  className="action-button"
                  disabled={!isActive || busy}
                  onClick={() => onAction(a.id)}
                  title={a.lore}
                >
                  {ACTION_LABELS[a.id] ?? a.label}
                </button>
              ))}
            </div>

            {!run && (
              <button className="btn btn-primary btn-lg" onClick={onStart} disabled={busy}>
                {busy ? '启动中...' : `开始链上试炼 - ${agent.agent.entryFeeQusd} QUSD`}
              </button>
            )}
          </div>

          {isActive && (
            <div className="hint-section">
              <h3>向 Agent 请求提示</h3>
              <div className="hint-controls">
                <select value={hintLevel} onChange={(e) => setHintLevel(Number(e.target.value) as 1 | 2 | 3)}>
                  <option value={1}>等级 1 - 方向</option>
                  <option value={2}>等级 2 - 范围</option>
                  <option value={3}>等级 3 - 接近答案</option>
                </select>
                <button className="btn btn-secondary" onClick={onHint} disabled={busy}>
                  请求提示（等级 {hintLevel}）
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>

        <aside className="run-right">
          <div className="chat-section">
            <div className="chat-header">
              <div>
                <h3>Agent 对话</h3>
                <span>{agent.agent.name} 会用谜语反馈链上动作</span>
              </div>
              <span className="token-badge">{agent.agent.tokenSymbol}</span>
            </div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">开始试炼后，Agent 会在这里回应。</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg chat-${m.role}`}>
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
