import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { fetchAgents, type AgentLobbyCard } from '../lib/api';

export function AgentLobby({ wallet }: { wallet: WalletState }) {
  const [agents, setAgents] = useState<AgentLobbyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">正在加载 Agent...</div>;
  if (error) return <div className="error-box">{error}</div>;
  const connected = wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : '未连接';

  return (
    <section>
      <div className="demo-hero">
        <div>
          <span className="hero-kicker">Uniswap V4 Hook on X Layer</span>
          <h1>PoolQuest</h1>
          <p>玩家用真实 AMM 动作解谜，交易进入 X Layer Testnet 的 V4 PoolManager，并由 PoolQuest Hook 记录行为。</p>
        </div>
        <div className="hero-proof">
          <span>当前池子</span>
          <strong>Dragon / QUSD</strong>
          <small>钱包：{connected} · 全链上交互</small>
        </div>
      </div>

      <div className="lobby-header">
        <div>
          <h2>Agent 地牢</h2>
          <p className="subtitle">选择一个已发布 Agent，进入 X Layer 上的 Hook 试炼。</p>
        </div>
        <Link to="/agents/create" className="btn btn-secondary">
          创建 Agent / 池子
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <p>还没有已发布的 Agent。</p>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map((a) => (
            <Link to={`/agents/${a.id}`} key={a.id} className="agent-card">
              <div className="agent-card-header">
                <span className="token-badge">{a.tokenSymbol}</span>
                <span className={`difficulty difficulty-${a.difficulty}`}>
                  {a.difficulty}
                </span>
              </div>
              <h3>{a.name}</h3>
              <p className="agent-theme">{a.theme}</p>
              <div className="agent-card-stats">
                <div>
                  <span className="stat-label">池子</span>
                  <span className="stat-value">{a.poolPair}</span>
                </div>
                <div>
                  <span className="stat-label">入场</span>
                  <span className="stat-value">{a.entryFeeQusd} QUSD</span>
                </div>
                <div>
                  <span className="stat-label">奖池</span>
                  <span className="stat-value">{a.prizePoolQusd} QUSD</span>
                </div>
                <div>
                  <span className="stat-label">通关</span>
                  <span className="stat-value">{a.clearCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
