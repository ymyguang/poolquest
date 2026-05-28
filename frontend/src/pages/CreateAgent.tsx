import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WalletState } from '../lib/wallet';
import { generateAgent } from '../lib/api';
import { getUiLanguage, text } from '../lib/i18n';

export function CreateAgent({ wallet }: { wallet: WalletState }) {
  const navigate = useNavigate();
  const lang = getUiLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    theme: '',
    persona: '',
    difficulty: 'medium',
    hintStyle: 'riddle',
    initialPrizePoolQusd: 0,
  });

  const update = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.address) { setError(text(lang, 'Connect wallet first', '请先连接钱包')); return; }
    if (!form.name || !form.theme) { setError(text(lang, 'Please fill Agent name and theme', '请填写 Agent 名称和主题')); return; }

    setBusy(true);
    setError('');
    try {
      const result = await generateAgent({ ...form, creatorAddress: wallet.address });
      navigate(`/agents/${result.agent.id}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : text(lang, 'Generation failed', '生成失败'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="create-agent">
      <h2>{text(lang, 'Create Agent and V4 Pool', '创建 Agent 与 V4 池子')}</h2>
      <p className="subtitle">
        {text(
          lang,
          'Set the Agent theme, persona, and difficulty. The system generates hidden paths and riddle feedback, then binds the Agent to a V4 Pool and Hook on X Layer at publish time.',
          '设定 Agent 的主题、性格和难度。系统会生成隐藏路径、谜语反馈，并在发布时绑定 X Layer 上的 V4 Pool 与 Hook。'
        )}
      </p>

      <form onSubmit={onSubmit} className="create-form">
        <label>
          {text(lang, 'Agent Name', 'Agent 名称')}
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Dragon"
            required
          />
        </label>

        <label>
          {text(lang, 'Dungeon Theme', '地牢主题')}
          <textarea
            value={form.theme}
            onChange={(e) => update('theme', e.target.value)}
            placeholder={text(lang, 'A dragon guarding a treasure pool in an ancient cave', '一条巨龙守着古老洞穴中的奖池')}
            rows={3}
            required
          />
        </label>

        <label>
          {text(lang, 'Agent Persona', 'Agent 性格')}
          <input
            value={form.persona}
            onChange={(e) => update('persona', e.target.value)}
            placeholder={text(lang, 'Ancient, proud, always speaks in riddles', '古老、骄傲、总是用谜语说话')}
          />
        </label>

        <label>
          {text(lang, 'Difficulty', '难度')}
          <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)}>
            <option value="easy">{text(lang, 'Easy (4 steps)', '简单（4 步）')}</option>
            <option value="medium">{text(lang, 'Medium (5 steps)', '中等（5 步）')}</option>
            <option value="hard">{text(lang, 'Hard (6 steps)', '困难（6 步）')}</option>
          </select>
        </label>

        <label>
          {text(lang, 'Hint Style', '提示风格')}
          <select value={form.hintStyle} onChange={(e) => update('hintStyle', e.target.value)}>
            <option value="riddle">{text(lang, 'Riddle', '谜语')}</option>
            <option value="direct">{text(lang, 'Direct', '直接')}</option>
            <option value="humorous">{text(lang, 'Humorous', '幽默')}</option>
          </select>
        </label>

        <label>
          {text(lang, 'Initial Prize Pool (QUSD, optional)', '初始奖池（QUSD，可选）')}
          <input
            type="number"
            min={0}
            value={form.initialPrizePoolQusd}
            onChange={(e) => update('initialPrizePoolQusd', Number(e.target.value))}
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? text(lang, 'Generating...', '生成中...') : text(lang, 'Generate Agent Design', '生成 Agent 设计')}
        </button>
      </form>
    </section>
  );
}
