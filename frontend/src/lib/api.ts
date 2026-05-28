/** PoolQuest API client. */

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'API error');
  return body.data as T;
}

// ─── Types ───────────────────────────────────────────────────────────

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

export interface AgentDetail {
  agent: {
    id: string;
    name: string;
    theme: string;
    persona: string;
    tokenSymbol: string;
    status: string;
    difficulty: string;
    entryFeeQusd: number;
    currentPrizePoolQusd: number;
    ruleHash: string;
    solutionHash: string;
    publishedAt: string | null;
    creatorAddress: string;
  };
  profile: {
    openingProphecy: string;
    visibleStages: string[];
    publicActions: { id: string; label: string; lore: string }[];
  };
  deployment: {
    qusdTokenAddress: string;
    agentTokenAddress: string;
    poolManagerAddress: string;
    hookAddress: string;
    poolId: string;
    registryAddress: string;
    initializeTxHash: string;
    publishTxHash: string;
  } | null;
}

export interface Run {
  id: string;
  agentId: string;
  status: string;
  progress: number;
  totalSteps: number;
  actionCount: number;
  hintCount: number;
  hintFeeTotalQusd: number;
  finalScore: number | null;
  stageStatuses?: string[];
  stages?: string[];
  timeRemaining?: number;
  startedAt?: string;
}

export interface FeedbackResponse {
  run: Run;
  feedback: { message: string; tone: string };
}

export interface HintResponse {
  feeQusd: string;
  scorePenalty: number;
  message: string;
}

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

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  completedAt: string;
}

export interface PrivateRule {
  agentId: string;
  hiddenPath: { step: number; action: string; params: Record<string, unknown> }[];
  punishments: { id: string; condition: string; scorePenalty: number }[];
  hintLadder: { level1: string[]; level2: string[]; level3: string[] };
}

// ─── Agent API ───────────────────────────────────────────────────────

export const fetchAgents = () => request<AgentLobbyCard[]>('/api/agents');

export const fetchAgent = (id: string) =>
  request<AgentDetail>(`/api/agents/${id}`);

export const generateAgent = (body: {
  creatorAddress: string;
  name: string;
  theme: string;
  persona?: string;
  difficulty?: string;
  hintStyle?: string;
  initialPrizePoolQusd?: number;
}) => request<{ agent: AgentDetail['agent']; profile: AgentDetail['profile'] }>(
  '/api/agents/generate', { method: 'POST', body: JSON.stringify(body) },
);

export const publishAgent = (id: string, creatorAddress: string) =>
  request<AgentDetail['agent']>(`/api/agents/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ creatorAddress }),
  });

export const fetchPrivateRule = (agentId: string, creatorAddress: string) =>
  request<PrivateRule>(`/api/agents/${agentId}/private-rule?creator=${creatorAddress}`);

export const fetchDeployment = (agentId: string) =>
  request<AgentDetail['deployment']>(`/api/agents/${agentId}/deployment`);

// ─── Run API ─────────────────────────────────────────────────────────

export const startRun = (agentId: string, playerAddress: string) =>
  request<Run>(`/api/agents/${agentId}/runs`, {
    method: 'POST',
    body: JSON.stringify({ playerAddress }),
  });

export const getRun = (runId: string) =>
  request<Run>(`/api/runs/${runId}`);

export const submitAction = (
  runId: string,
  actionType: string,
  payload?: Record<string, unknown>,
  txHash?: string,
) =>
  request<FeedbackResponse>(`/api/runs/${runId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ actionType, payload: payload || {}, txHash }),
  });

export const purchaseHint = (runId: string, level: 1 | 2 | 3) =>
  request<HintResponse>(`/api/runs/${runId}/hints`, {
    method: 'POST',
    body: JSON.stringify({ level }),
  });

export const fetchScore = (runId: string) =>
  request<ScoreBreakdown>(`/api/runs/${runId}/score`);

export const fetchLeaderboard = (agentId: string) =>
  request<LeaderboardEntry[]>(`/api/agents/${agentId}/leaderboard`);
