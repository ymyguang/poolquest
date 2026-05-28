/** Run Service — manages player runs, actions, hints, and scoring. */

import crypto from 'node:crypto';
import type { DatabaseAdapter } from '../adapters/database.js';
import type { LLMAdapter } from '../adapters/llm.js';
import type { RuleEngine } from './rule-engine.js';
import type {
  Run, RunAction, RunState, ActionType, RuleResult,
  FeedbackResponse, HintResponse, ScoreBreakdown,
} from '../types/index.js';
import { calculateHintFee, calculateScore } from './score-calculator.js';

const TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

export class RunService {
  constructor(
    private db: DatabaseAdapter,
    private llm: LLMAdapter,
    private engine: RuleEngine,
  ) {}

  async startRun(agentId: string, playerAddress: string): Promise<Run> {
    const agent = await this.db.getAgent(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'published') throw new Error('Agent not published');

    const rule = await this.db.getPrivateRule(agentId);
    if (!rule) throw new Error('Agent rule not found');

    const run: Run = {
      id: crypto.randomUUID(),
      agentId,
      playerAddress,
      status: 'active',
      progress: 0,
      totalSteps: rule.hiddenPath.length,
      startedAt: new Date().toISOString(),
      endedAt: null,
      actionCount: 0,
      hintCount: 0,
      entryFeeQusd: agent.entryFeeQusd,
      hintFeeTotalQusd: 0,
      cursePenalty: 0,
      hintPenalty: 0,
      finalScore: null,
      finalNetWorthQusd: null,
    };

    await this.db.createRun(run);

    // Add entry fee to prize pool
    const entryShare = agent.entryFeeQusd * 0.6;
    await this.db.updateAgent(agentId, {
      currentPrizePoolQusd: agent.currentPrizePoolQusd + entryShare,
    });

    return run;
  }

  async getRun(runId: string): Promise<Run | null> {
    return this.db.getRun(runId);
  }

  async submitAction(
    runId: string,
    actionType: ActionType,
    payload: Record<string, unknown>,
    txHash?: string,
  ): Promise<{ run: Run; feedback: FeedbackResponse }> {
    const run = await this.db.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.status !== 'active') throw new Error('Run is not active');

    // Check time limit
    const elapsed = Date.now() - new Date(run.startedAt).getTime();
    if (elapsed > TIME_LIMIT_MS) {
      await this.db.updateRun(runId, { status: 'failed', endedAt: new Date().toISOString() });
      throw new Error('Run time expired');
    }

    const rule = await this.db.getPrivateRule(run.agentId);
    if (!rule) throw new Error('Agent rule not found');

    const profile = await this.db.getPublicProfile(run.agentId);
    const actions = await this.db.listActions(runId);

    // Build run state
    const runState: RunState = {
      progress: run.progress,
      totalSteps: run.totalSteps,
      actionHistory: actions.map((a) => ({ type: a.actionType, timestamp: a.createdAt })),
      lastActionTime: actions.length > 0 ? actions[actions.length - 1].createdAt : null,
      holdStartTime: null,
      lpAddTime: null,
      netWorthQusd: run.finalNetWorthQusd ?? 100,
      curseFlags: [],
    };

    // Evaluate action
    const ruleResult = this.engine.evaluate(
      actionType, payload, runState, rule.hiddenPath, rule.punishments,
    );

    // Generate feedback
    const persona = profile?.agentPersona ?? { tone: 'mysterious' };
    const feedbackMessage = await this.llm.generateFeedback(
      persona, ruleResult, runState.progress, run.totalSteps,
    );

    // Determine feedback tone
    const tone = this.getFeedbackTone(ruleResult);

    // Save action
    const actionRecord: RunAction = {
      id: crypto.randomUUID(),
      runId,
      actionIndex: actions.length,
      actionType,
      actionPayload: payload,
      txHash: txHash ?? null,
      ruleResult,
      visibleFeedback: feedbackMessage,
      createdAt: new Date().toISOString(),
    };
    await this.db.addAction(actionRecord);

    // Update run
    const cursePenaltyAdd = ruleResult.curse ? Math.abs(ruleResult.scoreDelta) : 0;
    const updatedRun = await this.db.updateRun(runId, {
      progress: run.progress + ruleResult.progressDelta,
      actionCount: run.actionCount + 1,
      cursePenalty: run.cursePenalty + cursePenaltyAdd,
    });

    // Check completion
    if (ruleResult.completed) {
      const finalNetWorth = this.estimateNetWorth(run, actions, actionRecord);
      const durationSec = (Date.now() - new Date(run.startedAt).getTime()) / 1000;

      const completedRun = await this.db.updateRun(runId, {
        status: 'completed',
        endedAt: new Date().toISOString(),
        finalNetWorthQusd: finalNetWorth,
      });

      const allActions = await this.db.listActions(runId);
      const score = calculateScore(completedRun, allActions, durationSec);

      await this.db.updateRun(runId, { finalScore: score.totalScore });
      await this.db.upsertLeaderboard({
        rank: 0,
        wallet: run.playerAddress,
        score: score.totalScore,
        completedAt: new Date().toISOString(),
      });

      return {
        run: await this.db.getRun(runId) ?? completedRun,
        feedback: { message: feedbackMessage, tone: 'success' },
      };
    }

    return {
      run: updatedRun,
      feedback: { message: feedbackMessage, tone },
    };
  }

  async purchaseHint(
    runId: string,
    level: 1 | 2 | 3,
  ): Promise<HintResponse> {
    const run = await this.db.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.status !== 'active') throw new Error('Run is not active');

    const rule = await this.db.getPrivateRule(run.agentId);
    if (!rule) throw new Error('Agent rule not found');

    const profile = await this.db.getPublicProfile(run.agentId);
    const persona = profile?.agentPersona ?? { tone: 'mysterious' };

    const { feeQusd, scorePenalty } = calculateHintFee(
      level, run.hintCount, run.progress, run.totalSteps,
    );

    const message = await this.llm.generateHint(
      persona, level, run.progress, run.totalSteps, rule,
    );

    await this.db.updateRun(runId, {
      hintCount: run.hintCount + 1,
      hintFeeTotalQusd: run.hintFeeTotalQusd + feeQusd,
      hintPenalty: run.hintPenalty + scorePenalty,
    });

    // Add hint fee to prize pool
    const agent = await this.db.getAgent(run.agentId);
    if (agent) {
      await this.db.updateAgent(run.agentId, {
        currentPrizePoolQusd: agent.currentPrizePoolQusd + feeQusd,
      });
    }

    return {
      feeQusd: feeQusd.toFixed(2),
      scorePenalty,
      message,
    };
  }

  async getScore(runId: string): Promise<ScoreBreakdown> {
    const run = await this.db.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.status !== 'completed') throw new Error('Run not completed');

    const actions = await this.db.listActions(runId);
    const startTime = new Date(run.startedAt).getTime();
    const endTime = run.endedAt ? new Date(run.endedAt).getTime() : Date.now();
    const durationSec = (endTime - startTime) / 1000;

    return calculateScore(run, actions, durationSec);
  }

  async getLeaderboard(agentId: string) {
    return this.db.getLeaderboard(agentId);
  }

  async getRunVisibleState(runId: string) {
    const run = await this.db.getRun(runId);
    if (!run) return null;

    const rule = await this.db.getPrivateRule(run.agentId);
    const profile = await this.db.getPublicProfile(run.agentId);
    const stages = profile?.visibleStages ?? [];
    const totalSteps = rule?.hiddenPath.length ?? run.totalSteps;

    const stageStatuses = stages.map((name, i) => {
      if (i < run.progress) return 'done';
      if (i === run.progress && run.status === 'active') return 'current';
      if (run.status === 'completed' && i === stages.length - 1) return 'completed';
      return 'locked';
    });

    const elapsed = Date.now() - new Date(run.startedAt).getTime();
    const timeRemaining = Math.max(0, Math.floor((TIME_LIMIT_MS - elapsed) / 1000));

    return {
      ...run,
      stageStatuses,
      stages,
      timeRemaining,
      visibleProgress: `${run.progress}/${totalSteps}`,
    };
  }

  private getFeedbackTone(result: RuleResult): 'positive' | 'neutral' | 'danger' | 'success' {
    if (result.completed) return 'success';
    if (result.curse) return 'danger';
    if (result.danger) return 'danger';
    if (result.progressDelta > 0) return 'positive';
    return 'neutral';
  }

  private estimateNetWorth(
    run: Run,
    existingActions: RunAction[],
    lastAction: RunAction,
  ): number {
    // Start with 100 QUSD initial budget
    let netWorth = 100;
    const allActions = [...existingActions, lastAction];

    for (const a of allActions) {
      switch (a.actionType) {
        case 'donate':
          netWorth -= Number(a.actionPayload.amountQusd ?? 1);
          break;
        case 'add_liquidity':
          // LP position value (simplified: assume value preserved)
          break;
        case 'remove_liquidity':
          // Returned to wallet (simplified)
          break;
        case 'swap_buy':
          // Bought tokens, value depends on pool price (simplified)
          break;
        case 'swap_sell':
          // Sold tokens back to QUSD (simplified)
          break;
      }
    }

    // For completion, estimate based on action efficiency
    if (run.progress >= run.totalSteps - 1) {
      // Completed with minimal actions = more efficient = higher net worth
      const efficiency = Math.max(0, 1 - (run.actionCount - run.totalSteps) * 0.02);
      netWorth = Math.max(85, Math.min(120, 100 * efficiency + 5));
    }

    return Math.round(netWorth * 100) / 100;
  }
}
