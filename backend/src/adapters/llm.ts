/** LLM Adapter — generates quests, feedback, and hints. Includes deterministic fallback. */

import crypto from 'node:crypto';
import type {
  HiddenStep, Punishment, AgentPublicProfile, AgentPrivateRule,
  ActionType, RuleResult,
} from '../types/index.js';

export interface LLMAdapter {
  generateQuest(prompt: string, agentName: string, difficulty: string): Promise<{
    publicProfile: Omit<AgentPublicProfile, 'agentId'>;
    privateRule: Omit<AgentPrivateRule, 'agentId'>;
  }>;
  generateFeedback(
    persona: { tone: string },
    ruleResult: RuleResult,
    currentStep: number,
    totalSteps: number,
  ): Promise<string>;
  generateHint(
    persona: { tone: string },
    level: 1 | 2 | 3,
    currentStep: number,
    totalSteps: number,
    privateRule: AgentPrivateRule,
  ): Promise<string>;
}

// ─── Deterministic Fallback ──────────────────────────────────────────

const DRAGON_PATH: HiddenStep[] = [
  { step: 0, action: 'donate', params: { minAmountQusd: 1 } },
  { step: 1, action: 'swap_buy', params: { tokenOut: 'DRAGON' } },
  { step: 2, action: 'add_liquidity', params: { minDurationSeconds: 120 } },
  { step: 3, action: 'hold', params: { seconds: 120 } },
  { step: 4, action: 'swap_sell', params: { tokenIn: 'DRAGON' } },
];

const DRAGON_PUNISHMENTS: Punishment[] = [
  { id: 'quick_sell_curse', condition: 'swap_sell within 60s after swap_buy', scorePenalty: 300, type: 'major' },
  { id: 'quick_lp_exit', condition: 'remove_liquidity within 60s after add_liquidity', scorePenalty: 200, type: 'minor' },
];

const STAGE_NAMES = ['拜访', '钥匙', '锁链', '沉默', '突破'];

const FEEDBACK_TEMPLATES: Record<string, string[]> = {
  correct: [
    '有什么东西在暗处动了一下。也许它注意到了你。',
    '空气里有一丝变化。你不确定是好是坏。',
    '远处传来一声低沉的回应。',
  ],
  wrong: [
    '你转身的时候，身后有什么东西安静下来了。那不是好的安静。',
    '空气凝固了一瞬，然后恢复了平静。但你感觉错过了什么。',
    '远处的光芒暗淡了一些。',
  ],
  danger: [
    '有些转身来得太早。金币还烫着。',
    '你感到一股不安的气息。也许现在不是正确的时候。',
    '有什么东西在警告你，但你不确定是什么。',
  ],
  neutral: [
    '你做了什么。但你不确定它是否重要。',
    '周围没有明显的变化。',
    '一切似乎和之前一样。',
  ],
};

export class FallbackLLMAdapter implements LLMAdapter {
  async generateQuest(prompt: string, agentName: string, _difficulty: string) {
    const tokenSymbol = agentName.toUpperCase().slice(0, 8);
    const persona = { tone: 'ancient, proud, speaks in riddles', forbiddenStyle: 'never mention raw action names' };

    const publicProfile: Omit<AgentPublicProfile, 'agentId'> = {
      openingProphecy:
        `"古老的${agentName}只接受诚心的拜访者。\n先证明你的诚意，再谈金币的事。"`,
      visibleStages: STAGE_NAMES,
      publicActions: [
        { id: 'swap_buy', label: `Buy ${tokenSymbol}`, lore: `Exchange QUSD for ${tokenSymbol}` },
        { id: 'swap_sell', label: `Sell ${tokenSymbol}`, lore: `Exchange ${tokenSymbol} for QUSD` },
        { id: 'add_liquidity', label: 'Add LP', lore: 'Provide liquidity to the pool' },
        { id: 'remove_liquidity', label: 'Remove LP', lore: 'Withdraw your liquidity' },
        { id: 'donate', label: 'Donate', lore: 'Offer QUSD to the pool' },
        { id: 'hold', label: 'Hold', lore: 'Wait for the right moment' },
      ],
      agentPersona: persona,
    };

    const privateRule: Omit<AgentPrivateRule, 'agentId'> = {
      hiddenPath: DRAGON_PATH,
      punishments: DRAGON_PUNISHMENTS,
      blessings: [],
      hintLadder: {
        level1: [
          '火焰需要时间，金币需要耐心',
          '有些门不是推开的，是等开的',
          '诚意不是用嘴说的',
        ],
        level2: [
          '让时间站在你这边',
          '真正的财富不是拿起来，而是放下去再拿起来',
          '盔甲需要时间才能贴合身体',
        ],
        level3: [
          '安静地坐在龙穴里，等火焰低头',
          '先把东西放下，再拿起金币，然后等待',
          '龙需要看到你的耐心',
        ],
      },
      feedbackTemplates: {},
    };

    return { publicProfile, privateRule };
  }

  async generateFeedback(
    _persona: { tone: string },
    ruleResult: RuleResult,
    _currentStep: number,
    _totalSteps: number,
  ): Promise<string> {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (ruleResult.completed) {
      return '宝藏的门已经打开。你做到了。';
    }
    if (ruleResult.curse) {
      return pick(FEEDBACK_TEMPLATES.danger);
    }
    if (ruleResult.progressDelta > 0) {
      return pick(FEEDBACK_TEMPLATES.correct);
    }
    if (ruleResult.danger) {
      return pick(FEEDBACK_TEMPLATES.danger);
    }
    return pick(FEEDBACK_TEMPLATES.wrong);
  }

  async generateHint(
    _persona: { tone: string },
    level: 1 | 2 | 3,
    _currentStep: number,
    _totalSteps: number,
    privateRule: AgentPrivateRule,
  ): Promise<string> {
    const ladderKey = `level${level}` as 'level1' | 'level2' | 'level3';
    const hints = privateRule.hintLadder[ladderKey];
    return hints[Math.floor(Math.random() * hints.length)] ?? '没有更多的提示了。';
  }
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createLLMAdapter(): LLMAdapter {
  return new FallbackLLMAdapter();
}
