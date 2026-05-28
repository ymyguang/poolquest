/** Quest Score calculator — implements the scoring formula from 玩法.md. */

import type { ScoreBreakdown, Run, RunAction } from '../types/index.js';

const TIME_LIMIT_SECONDS = 600; // 10 minutes
const INITIAL_NET_WORTH = 100;

export function calculateScore(
  run: Run,
  actions: RunAction[],
  durationSeconds: number,
): ScoreBreakdown {
  const completionScore = run.status === 'completed' ? 1000 : 0;

  const netWorthDelta = (run.finalNetWorthQusd ?? INITIAL_NET_WORTH) - INITIAL_NET_WORTH;
  const netWorthScore = clamp(Math.round(netWorthDelta * 20), -500, 1000);

  const timeScore = run.status === 'completed'
    ? clamp(Math.round(300 * (1 - durationSeconds / TIME_LIMIT_SECONDS)), 0, 300)
    : 0;

  const actionCount = actions.filter((a) => a.actionType !== 'ask_hint').length;
  const efficiencyScore = getEfficiencyScore(actionCount);

  const lpScore = calculateLpContribution(actions);

  const hintPenalty = run.hintPenalty;
  const cursePenalty = run.cursePenalty;

  const totalScore = Math.max(
    0,
    completionScore + netWorthScore + timeScore + efficiencyScore + lpScore
      - hintPenalty - cursePenalty,
  );

  return {
    completionScore,
    netWorthScore,
    timeScore,
    efficiencyScore,
    lpContributionScore: lpScore,
    hintPenalty,
    cursePenalty,
    totalScore,
  };
}

function getEfficiencyScore(actionCount: number): number {
  if (actionCount <= 5) return 300;
  if (actionCount === 6) return 250;
  if (actionCount === 7) return 200;
  if (actionCount === 8) return 150;
  if (actionCount === 9) return 100;
  if (actionCount === 10) return 50;
  return 0;
}

function calculateLpContribution(actions: RunAction[]): number {
  let bestScore = 0;

  for (let i = 0; i < actions.length; i++) {
    if (actions[i].actionType !== 'add_liquidity') continue;

    const addTime = new Date(actions[i].createdAt).getTime();
    // Find next remove_liquidity or end of run
    let removeTime: number | null = null;
    for (let j = i + 1; j < actions.length; j++) {
      if (actions[j].actionType === 'remove_liquidity') {
        removeTime = new Date(actions[j].createdAt).getTime();
        break;
      }
    }

    const durationMs = (removeTime ?? Date.now()) - addTime;
    const durationSec = durationMs / 1000;

    if (durationSec < 60) {
      bestScore = Math.min(bestScore, -150); // Quick exit penalty
    } else if (durationSec >= 300) {
      bestScore = Math.max(bestScore, 300);
    } else if (durationSec >= 180) {
      bestScore = Math.max(bestScore, 200);
    } else if (durationSec >= 120) {
      bestScore = Math.max(bestScore, 100);
    }
  }

  return clamp(bestScore, -150, 300);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Hint Fee Calculator ─────────────────────────────────────────────

const BASE_HINT_FEE: Record<number, number> = { 1: 0.2, 2: 0.6, 3: 1.5 };
const BASE_HINT_PENALTY: Record<number, number> = { 1: 50, 2: 150, 3: 400 };

function getRepeatMultiplier(hintCount: number): number {
  if (hintCount <= 0) return 1;
  if (hintCount === 1) return 1;
  if (hintCount === 2) return 1.5;
  if (hintCount === 3) return 2.5;
  if (hintCount === 4) return 4;
  return 6;
}

function getProgressMultiplier(progress: number, totalSteps: number): number {
  if (progress >= totalSteps) return 5;
  if (progress >= totalSteps - 1) return 5;
  if (progress >= totalSteps - 2) return 3;
  if (progress >= totalSteps - 3) return 2;
  if (progress >= totalSteps - 4) return 1.5;
  return 1;
}

export function calculateHintFee(
  level: 1 | 2 | 3,
  hintCount: number,
  progress: number,
  totalSteps: number,
): { feeQusd: number; scorePenalty: number } {
  const base = BASE_HINT_FEE[level] ?? 0.2;
  const basePenalty = BASE_HINT_PENALTY[level] ?? 50;
  const repeat = getRepeatMultiplier(hintCount);
  const progressMult = getProgressMultiplier(progress, totalSteps);

  return {
    feeQusd: Math.round(base * repeat * progressMult * 100) / 100,
    scorePenalty: Math.round(basePenalty * repeat * progressMult),
  };
}
