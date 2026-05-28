import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { fetchAgents, type AgentLobbyCard } from '../lib/api';
import { getUiLanguage, text } from '../lib/i18n';

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

  const lang = getUiLanguage();
  if (loading) return <div className="loading">{text(lang, 'Loading Agents...', '正在加载 Agent...')}</div>;
  if (error) return <div className="error-box">{error}</div>;
  const connected = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : text(lang, 'Not connected', '未连接');

  return (
    <section>
      <div className="demo-hero">
        <div>
          <span className="hero-kicker">Uniswap V4 Hook on X Layer</span>
          <h1>PoolQuest</h1>
          <p>{text(
            lang,
            'Players solve AI riddles with real AMM actions. Transactions enter the X Layer Testnet V4 PoolManager and PoolQuest Hook records behavior.',
            '玩家用真实 AMM 动作解谜，交易进入 X Layer Testnet 的 V4 PoolManager，并由 PoolQuest Hook 记录行为。'
          )}</p>
        </div>
        <div className="hero-proof">
          <span>{text(lang, 'Current Pool', '当前池子')}</span>
          <strong>Dragon / QUSD</strong>
          <small>{text(lang, 'Wallet', '钱包')}：{connected} · {text(lang, 'Fully on-chain interaction', '全链上交互')}</small>
        </div>
      </div>

      <div className="lobby-header">
        <div>
          <h2>{text(lang, 'Agent Dungeons', 'Agent 地牢')}</h2>
          <p className="subtitle">{text(lang, 'Choose a published Agent and enter the X Layer Hook trial.', '选择一个已发布 Agent，进入 X Layer 上的 Hook 试炼。')}</p>
        </div>
        <Link to="/agents/create" className="btn btn-secondary">
          {text(lang, 'Create Agent / Pool', '创建 Agent / 池子')}
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <p>{text(lang, 'No published Agents yet.', '还没有已发布的 Agent。')}</p>
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
                  <span className="stat-label">{text(lang, 'Pool', '池子')}</span>
                  <span className="stat-value">{a.poolPair}</span>
                </div>
                <div>
                  <span className="stat-label">{text(lang, 'Entry', '入场')}</span>
                  <span className="stat-value">{a.entryFeeQusd} QUSD</span>
                </div>
                <div>
                  <span className="stat-label">{text(lang, 'Prize Pool', '奖池')}</span>
                  <span className="stat-value">{a.prizePoolQusd} QUSD</span>
                </div>
                <div>
                  <span className="stat-label">{text(lang, 'Clears', '通关')}</span>
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
