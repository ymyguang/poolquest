export type QuestAction = 'donate' | 'addLp' | 'removeLp' | 'buy' | 'sell' | 'hold';

export type StepStatus = 'locked' | 'done' | 'danger' | 'complete';

export type QuestState = {
  id: string;
  active: boolean;
  completed: boolean;
  progress: number;
  startedAt: number | null;
  boughtAt: number | null;
  hintCount: number;
  actionCount: number;
  hintPenalty: number;
  cursePenalty: number;
  score: number;
  qusd: number;
  dragon: number;
  feedback: string;
  log: string[];
  stageStatuses: StepStatus[];
};

export const HOLD_SECONDS = 180;
export const DEMO_HOLD_SECONDS = 8;

export type PublicQuest = {
  id: string;
  theme: string;
  agentName: string;
  poolPair: string;
  openingProphecy: string;
  publicStages: string[];
  actions: Array<{ id: QuestAction; label: string; lore: string }>;
  note: string;
};

export const emptyQuestState = (): QuestState => ({
  id: '',
  active: false,
  completed: false,
  progress: 0,
  startedAt: null,
  boughtAt: null,
  hintCount: 0,
  actionCount: 0,
  hintPenalty: 0,
  cursePenalty: 0,
  score: 0,
  qusd: 100,
  dragon: 25,
  feedback: '等待后台加载 Agent 预言。',
  log: [],
  stageStatuses: ['locked', 'locked', 'locked', 'locked', 'locked']
});

const progressMultiplier = (progress: number) => {
  if (progress <= 1) return 1;
  if (progress === 2) return 1.5;
  if (progress === 3) return 2;
  if (progress === 4) return 3;
  return 5;
};

const repeatMultiplier = (nextAsk: number) => {
  if (nextAsk === 1) return 1;
  if (nextAsk === 2) return 1.5;
  if (nextAsk === 3) return 2.5;
  if (nextAsk === 4) return 4;
  return 6;
};

export const hintQuote = (state: QuestState, level: 1 | 2 | 3) => {
  const baseFee = level === 1 ? 0.2 : level === 2 ? 0.6 : 1.5;
  const basePenalty = level === 1 ? 50 : level === 2 ? 150 : 400;
  const repeat = repeatMultiplier(state.hintCount + 1);
  const progress = progressMultiplier(state.progress);
  return {
    fee: baseFee * repeat * progress,
    penalty: Math.round(basePenalty * repeat * progress)
  };
};

export const stepStatuses = (state: QuestState): StepStatus[] => {
  return state.stageStatuses;
};
