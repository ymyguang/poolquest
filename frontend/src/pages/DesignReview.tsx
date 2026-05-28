import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { fetchAgent, fetchPrivateRule, type AgentDetail, type PrivateRule } from '../lib/api';

export function DesignReview({ wallet }: { wallet: WalletState }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AgentDetail | null>(null);
  const [rule, setRule] = useState<PrivateRule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !wallet.address) return;
    Promise.all([
      fetchAgent(id),
      fetchPrivateRule(id, wallet.address),
    ])
      .then(([agent, r]) => { setData(agent); setRule(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, wallet.address]);

  if (!wallet.address) return <div className="error-box">请先连接钱包</div>;
  if (loading) return <div className="loading">正在加载审查数据...</div>;
  if (!data || !rule) return <div className="error-box">未找到 Agent，或当前钱包没有审查权限</div>;

  const { agent, profile } = data;
  const ACTION_LABELS: Record<string, string> = {
    donate: '捐赠 QUSD',
    swap_buy: `买入 ${agent.tokenSymbol}`,
    swap_sell: `卖出 ${agent.tokenSymbol}`,
    add_liquidity: '添加流动性',
    remove_liquidity: '移除流动性',
    hold: '等待时机',
  };

  return (
    <section className="design-review">
      <Link to={`/agents/${id}`} className="back-link">&larr; 返回 Agent</Link>
      <h2>创作者设计审查</h2>
      <p className="subtitle">隐藏路径仅对创作者可见，用于检查关卡、提示梯子和惩罚规则。</p>

      <div className="review-grid">
        <div className="review-card">
          <h3>公开信息</h3>
          <p><strong>名称：</strong> {agent.name}</p>
          <p><strong>代币：</strong> {agent.tokenSymbol}/QUSD</p>
          <p><strong>难度：</strong> {agent.difficulty}</p>
          <p><strong>规则哈希：</strong> <code>{agent.ruleHash.slice(0, 22)}...</code></p>
        </div>

        <div className="review-card">
          <h3>开场预言</h3>
          <p className="prophecy-text">{profile.openingProphecy}</p>
        </div>

        <div className="review-card wide">
          <h3>可见阶段</h3>
          <div className="stages-row">
            {profile.visibleStages.map((stage, i) => (
              <div key={i} className="stage-node">
                <span className="stage-icon">[ ]</span>
                <span className="stage-name">{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="review-card wide">
          <h3>隐藏路径（仅创作者可见）</h3>
          <table className="hidden-path-table">
            <thead>
              <tr><th>步骤</th><th>动作</th><th>参数</th></tr>
            </thead>
            <tbody>
              {rule.hiddenPath.map((step) => (
                <tr key={step.step}>
                  <td>{step.step + 1}</td>
                  <td><code>{ACTION_LABELS[step.action] || step.action}</code></td>
                  <td className="mono">{JSON.stringify(step.params)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rule.punishments.length > 0 && (
          <div className="review-card wide">
            <h3>惩罚规则</h3>
            <ul>
              {rule.punishments.map((p) => (
                <li key={p.id}>
                  <code>{p.id}</code>: {p.condition} (-{p.scorePenalty} pts)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="review-card wide">
          <h3>提示梯子预览</h3>
          <div className="hint-preview">
            <div>
              <strong>等级 1：</strong> {rule.hintLadder.level1[0]}
            </div>
            <div>
              <strong>等级 2：</strong> {rule.hintLadder.level2[0]}
            </div>
            <div>
              <strong>等级 3：</strong> {rule.hintLadder.level3[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={() => navigate(`/agents/${id}`)}>
          返回
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/agents/${id}/publish`)}>
          发布 Agent
        </button>
      </div>
    </section>
  );
}
