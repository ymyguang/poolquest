/** Shared types for PoolQuest backend. */

// ─── Agent ───────────────────────────────────────────────────────────

export type AgentStatus =
  | 'draft'
  | 'generated'
  | 'publishing'
  | 'published'
  | 'paused'
  | 'review'
  | 'archived';

export interface Agent {
  id: string;
  creatorAddress: string;
  slug: string;
  name: string;
  theme: string;
  persona: string;
  tokenName: string;
  tokenSymbol: string;
  status: AgentStatus;
  difficulty: 'easy' | 'medium' | 'hard';
  hintStyle: string;
  entryFeeQusd: number;
  prizePoolSeedQusd: number;
  currentPrizePoolQusd: number;
  ruleHash: string;
  solutionHash: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface AgentPublicProfile {
  agentId: string;
  openingProphecy: string;
  visibleStages: string[];
  publicActions: PublicAction[];
  agentPersona: { tone: string; forbiddenStyle: string };
}

export interface PublicAction {
  id: string;
  label: string;
  lore: string;
}

export interface HiddenStep {
  step: number;
  action: ActionType;
  params: Record<string, unknown>;
}

export interface Punishment {
  id: string;
  condition: string;
  scorePenalty: number;
  type: 'minor' | 'major' | 'fatal';
}

export interface AgentPrivateRule {
  agentId: string;
  hiddenPath: HiddenStep[];
  punishments: Punishment[];
  blessings: unknown[];
  hintLadder: { level1: string[]; level2: string[]; level3: string[] };
  feedbackTemplates: Record<string, string>;
}

export interface AgentDeployment {
  agentId: string;
  chainId: number;
  qusdTokenAddress: string;
  agentTokenAddress: string;
  poolManagerAddress: string;
  hookAddress: string;
  registryAddress: string;
  poolId: string;
  initializeTxHash: string;
  publishTxHash: string;
}

// ─── Run ─────────────────────────────────────────────────────────────

export type RunStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface Run {
  id: string;
  agentId: string;
  playerAddress: string;
  status: RunStatus;
  progress: number;
  totalSteps: number;
  startedAt: string;
  endedAt: string | null;
  actionCount: number;
  hintCount: number;
  entryFeeQusd: number;
  hintFeeTotalQusd: number;
  cursePenalty: number;
  hintPenalty: number;
  finalScore: number | null;
  finalNetWorthQusd: number | null;
}

export interface RunAction {
  id: string;
  runId: string;
  actionIndex: number;
  actionType: ActionType;
  actionPayload: Record<string, unknown>;
  txHash: string | null;
  ruleResult: RuleResult;
  visibleFeedback: string | null;
  createdAt: string;
}

// ─── Actions ─────────────────────────────────────────────────────────

export type ActionType =
  | 'swap_buy'
  | 'swap_sell'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'donate'
  | 'hold'
  | 'ask_hint';

// ─── Rule Engine ─────────────────────────────────────────────────────

export interface RuleResult {
  progressDelta: number;
  feedbackIntent: string;
  danger: boolean;
  curse: string | null;
  completed: boolean;
  scoreDelta: number;
  mustNotReveal: string[];
}

export interface RunState {
  progress: number;
  totalSteps: number;
  actionHistory: { type: ActionType; timestamp: string }[];
  lastActionTime: string | null;
  holdStartTime: string | null;
  lpAddTime: string | null;
  netWorthQusd: number;
  curseFlags: string[];
}

// ─── Score ───────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  completionScore: number;
  netWorthScore: number;
  timeScore: number;
  efficiencyScore: number;
  lpContributionScore: number;
  hintPenalty: number;
  cursePenalty: number;
  totalScore: number;
}

// ─── Feedback / Hints ────────────────────────────────────────────────

export interface FeedbackResponse {
  message: string;
  tone: 'positive' | 'neutral' | 'danger' | 'success';
}

export interface HintResponse {
  feeQusd: string;
  scorePenalty: number;
  message: string;
}

// ─── API ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
}

export interface AgentLobbyCard {
  id: string;
  name: string;
  theme: string;
  tokenSymbol: string;
  poolPair: string;
  entryFeeQusd: number;
  prizePoolQusd: number;
  difficulty: string;
  activePlayers: number;
  clearCount: number;
  creatorAddress: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  completedAt: string;
}
