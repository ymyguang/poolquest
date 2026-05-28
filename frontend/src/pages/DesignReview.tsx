import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { fetchAgent, fetchPrivateRule, type AgentDetail, type PrivateRule } from '../lib/api';
import { getUiLanguage, prophecyText, stageText, text } from '../lib/i18n';

export function DesignReview({ wallet }: { wallet: WalletState }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lang = getUiLanguage();
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

  if (!wallet.address) return <div className="error-box">{text(lang, 'Connect wallet first', '请先连接钱包')}</div>;
  if (loading) return <div className="loading">{text(lang, 'Loading design review...', '正在加载审查数据...')}</div>;
  if (!data || !rule) return <div className="error-box">{text(lang, 'Agent not found or wallet is not authorized', '未找到 Agent，或当前钱包没有审查权限')}</div>;

  const { agent, profile } = data;
  const ACTION_LABELS: Record<string, string> = {
    donate: text(lang, 'Donate QUSD', '捐赠 QUSD'),
    swap_buy: text(lang, `Buy ${agent.tokenSymbol}`, `买入 ${agent.tokenSymbol}`),
    swap_sell: text(lang, `Sell ${agent.tokenSymbol}`, `卖出 ${agent.tokenSymbol}`),
    add_liquidity: text(lang, 'Add Liquidity', '添加流动性'),
    remove_liquidity: text(lang, 'Remove Liquidity', '移除流动性'),
    hold: text(lang, 'Hold', '等待时机'),
  };

  return (
    <section className="design-review">
      <Link to={`/agents/${id}`} className="back-link">&larr; {text(lang, 'Back to Agent', '返回 Agent')}</Link>
      <h2>{text(lang, 'Creator Design Review', '创作者设计审查')}</h2>
      <p className="subtitle">{text(lang, 'Hidden paths are visible to the creator only for checking stages, hints, and penalties.', '隐藏路径仅对创作者可见，用于检查关卡、提示梯子和惩罚规则。')}</p>

      <div className="review-grid">
        <div className="review-card">
          <h3>{text(lang, 'Public Profile', '公开信息')}</h3>
          <p><strong>{text(lang, 'Name:', '名称：')}</strong> {agent.name}</p>
          <p><strong>{text(lang, 'Token:', '代币：')}</strong> {agent.tokenSymbol}/QUSD</p>
          <p><strong>{text(lang, 'Difficulty:', '难度：')}</strong> {agent.difficulty}</p>
          <p><strong>{text(lang, 'Rule Hash:', '规则哈希：')}</strong> <code>{agent.ruleHash.slice(0, 22)}...</code></p>
        </div>

        <div className="review-card">
          <h3>{text(lang, 'Opening Prophecy', '开场预言')}</h3>
          <p className="prophecy-text">{prophecyText(profile.openingProphecy, lang)}</p>
        </div>

        <div className="review-card wide">
          <h3>{text(lang, 'Visible Stages', '可见阶段')}</h3>
          <div className="stages-row">
            {profile.visibleStages.map((stage, i) => (
              <div key={i} className="stage-node">
                <span className="stage-icon">[ ]</span>
                <span className="stage-name">{stageText(stage, lang)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="review-card wide">
          <h3>{text(lang, 'Hidden Path (Creator Only)', '隐藏路径（仅创作者可见）')}</h3>
          <table className="hidden-path-table">
            <thead>
              <tr><th>{text(lang, 'Step', '步骤')}</th><th>{text(lang, 'Action', '动作')}</th><th>{text(lang, 'Parameters', '参数')}</th></tr>
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
            <h3>{text(lang, 'Punishment Rules', '惩罚规则')}</h3>
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
          <h3>{text(lang, 'Hint Ladder Preview', '提示梯子预览')}</h3>
          <div className="hint-preview">
            <div>
              <strong>{text(lang, 'Level 1:', '等级 1：')}</strong> {rule.hintLadder.level1[0]}
            </div>
            <div>
              <strong>{text(lang, 'Level 2:', '等级 2：')}</strong> {rule.hintLadder.level2[0]}
            </div>
            <div>
              <strong>{text(lang, 'Level 3:', '等级 3：')}</strong> {rule.hintLadder.level3[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={() => navigate(`/agents/${id}`)}>
          {text(lang, 'Back', '返回')}
        </button>
        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/agents/${id}/publish`)}>
          {text(lang, 'Publish Agent', '发布 Agent')}
        </button>
      </div>
    </section>
  );
}
