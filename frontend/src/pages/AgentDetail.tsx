import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { fetchAgent, fetchLeaderboard, type AgentDetail, type LeaderboardEntry } from '../lib/api';
import { xlayerDeployment } from '../config/deployment';

export function AgentDetail({ wallet }: { wallet: WalletState }) {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AgentDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchAgent(id), fetchLeaderboard(id)])
      .then(([agent, lb]) => { setData(agent); setLeaderboard(lb); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">正在加载...</div>;
  if (!data) return <div className="error-box">未找到 Agent</div>;

  const { agent, profile, deployment } = data;
  const explorer = xlayerDeployment.network.explorerUrl;
  const addressUrl = (address: string) => `${explorer}/address/${address}`;
  const txUrl = (hash: string) => `${explorer}/tx/${hash}`;

  return (
    <section className="agent-detail">
      <Link to="/" className="back-link">&larr; 返回大厅</Link>

      <div className="detail-header">
        <div>
          <span className="token-badge large">{agent.tokenSymbol}</span>
          <h2>{agent.name}</h2>
          <p className="agent-theme">{agent.theme}</p>
        </div>
        <div className="detail-meta">
          <span className={`difficulty difficulty-${agent.difficulty}`}>{agent.difficulty}</span>
          <span className="pool-pair">{agent.tokenSymbol}/QUSD</span>
        </div>
      </div>

      <div className="prophecy-box">
        <h3>开场预言</h3>
        <p className="prophecy-text">{profile.openingProphecy}</p>
      </div>

      <div className="stages-row">
        {profile.visibleStages.map((stage, i) => (
          <div key={i} className="stage-node">
            <span className="stage-icon">[ ]</span>
            <span className="stage-name">{stage}</span>
          </div>
        ))}
      </div>

      <div className="detail-stats">
        <div className="stat-card">
          <span className="stat-label">入场费</span>
          <span className="stat-big">{agent.entryFeeQusd} QUSD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">奖池</span>
          <span className="stat-big">{agent.currentPrizePoolQusd} QUSD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">规则哈希</span>
          <span className="stat-mono">{agent.ruleHash.slice(0, 18)}...</span>
        </div>
      </div>

      {deployment && (
        <div className="deployment-box">
          <h3>X Layer 部署证明</h3>
          <div className="deploy-grid">
            <div>
              <span className="stat-label">Agent Token</span>
              <a href={addressUrl(deployment.agentTokenAddress)} target="_blank" rel="noreferrer">
                <code>{deployment.agentTokenAddress.slice(0, 18)}...</code>
              </a>
            </div>
            <div>
              <span className="stat-label">Hook</span>
              <a href={addressUrl(deployment.hookAddress)} target="_blank" rel="noreferrer">
                <code>{deployment.hookAddress.slice(0, 18)}...</code>
              </a>
            </div>
            <div>
              <span className="stat-label">Registry</span>
              <a href={addressUrl(deployment.registryAddress)} target="_blank" rel="noreferrer">
                <code>{deployment.registryAddress.slice(0, 18)}...</code>
              </a>
            </div>
            <div>
              <span className="stat-label">V4 Pool ID</span>
              <code>{deployment.poolId.slice(0, 18)}...</code>
            </div>
            <div>
              <span className="stat-label">初始化交易</span>
              <a href={txUrl(deployment.initializeTxHash)} target="_blank" rel="noreferrer">
                <code>{deployment.initializeTxHash.slice(0, 18)}...</code>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="detail-actions">
        <Link to={`/agents/${id}/run`} className="btn btn-primary btn-lg">
          进入链上试炼
        </Link>
        {!wallet.address && <span className="demo-note">需要先连接 OKX / MetaMask 钱包。</span>}
        {wallet.address && wallet.address.toLowerCase() === agent.creatorAddress?.toLowerCase() && (
          <Link to={`/agents/${id}/review`} className="btn btn-secondary">
            创作者视图
          </Link>
        )}
      </div>

      {leaderboard.length > 0 && (
        <div className="leaderboard-box">
          <h3>排行榜</h3>
          <table className="leaderboard-table">
            <thead>
              <tr><th>#</th><th>玩家</th><th>分数</th></tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 10).map((e) => (
                <tr key={e.rank}>
                  <td>{e.rank}</td>
                  <td className="mono">{e.wallet.slice(0, 8)}...{e.wallet.slice(-4)}</td>
                  <td>{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
