import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { publishAgent } from '../lib/api';
import { xlayerDeployment } from '../config/deployment';

export function PublishConfirm({ wallet }: { wallet: WalletState }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ txHash: string } | null>(null);

  const onPublish = async () => {
    if (!id || !wallet.address) return;
    setBusy(true);
    setError('');
    try {
      const agent = await publishAgent(id, wallet.address);
      setResult({ txHash: agent.ruleHash }); // placeholder
      setTimeout(() => navigate(`/agents/${id}`), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <section className="publish-confirm">
        <div className="success-box">
          <h2>Agent 已发布</h2>
          <p>正在返回 Agent 详情页...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="publish-confirm">
      <Link to={`/agents/${id}/review`} className="back-link">&larr; 返回审查</Link>
      <h2>发布 Agent</h2>

      <div className="publish-info">
        <div className="info-row">
          <span>创建成本</span>
          <span className="highlight">Free (MVP)</span>
        </div>
        <div className="info-row">
          <span>发布后动作</span>
          <span>使用已验证的 AgentToken + Hook + V4 Pool 部署信息完成登记</span>
        </div>
        <div className="info-row">
          <span>链</span>
          <span>X Layer (Chain ID {xlayerDeployment.network.chainId})</span>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary btn-lg" onClick={onPublish} disabled={busy}>
        {busy ? '发布中...' : '确认并发布'}
      </button>
    </section>
  );
}
