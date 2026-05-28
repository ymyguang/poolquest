/** Rule Engine — deterministic evaluation of player actions against hidden rules. */

import type {
  ActionType, RuleResult, RunState, HiddenStep, Punishment,
} from '../types/index.js';

export class RuleEngine {
  evaluate(
    action: ActionType,
    payload: Record<string, unknown>,
    runState: RunState,
    hiddenPath: HiddenStep[],
    punishments: Punishment[],
  ): RuleResult {
    const result: RuleResult = {
      progressDelta: 0,
      feedbackIntent: 'neutral',
      danger: false,
      curse: null,
      completed: false,
      scoreDelta: 0,
      mustNotReveal: [],
    };

    const currentStep = hiddenPath[runState.progress];
    if (!currentStep) {
      // Already completed or invalid state
      result.feedbackIntent = 'already_completed';
      return result;
    }

    // Check if action matches current hidden step
    if (this.matchesStep(action, payload, currentStep)) {
      result.progressDelta = 1;
      result.feedbackIntent = `correct_${currentStep.action}`;
      runState.progress += 1;

      if (runState.progress >= hiddenPath.length) {
        result.completed = true;
        result.feedbackIntent = 'completed';
      }

      result.mustNotReveal.push(
        ...hiddenPath.slice(runState.progress).map((s) => s.action),
      );
    } else {
      result.feedbackIntent = `wrong_expected_${currentStep.action}`;
      result.mustNotReveal.push(currentStep.action);
    }

    // Check punishments
    const curse = this.checkPunishments(action, runState, punishments);
    if (curse) {
      result.curse = curse.id;
      result.danger = true;
      result.scoreDelta -= curse.scorePenalty;
      result.feedbackIntent = `curse_${curse.id}`;
    }

    // Danger state: if player did something risky
    if (this.isDangerousAction(action, runState)) {
      result.danger = true;
    }

    return result;
  }

  private matchesStep(
    action: ActionType,
    payload: Record<string, unknown>,
    step: HiddenStep,
  ): boolean {
    if (action !== step.action) return false;

    // Additional parameter checks
    switch (step.action) {
      case 'donate': {
        const min = Number(step.params.minAmountQusd ?? 0);
        const amount = Number(payload.amountQusd ?? 0);
        return amount >= min;
      }
      case 'hold': {
        const required = Number(step.params.seconds ?? 0);
        const held = Number(payload.heldSeconds ?? 0);
        return held >= required;
      }
      case 'add_liquidity': {
        // add_liquidity matches immediately; duration is verified at completion
        // (via LP Contribution Score, not path matching)
        return true;
      }
      default:
        return true;
    }
  }

  private checkPunishments(
    action: ActionType,
    runState: RunState,
    punishments: Punishment[],
  ): Punishment | null {
    for (const p of punishments) {
      if (this.triggersPunishment(action, runState, p)) {
        return p;
      }
    }
    return null;
  }

  private triggersPunishment(
    action: ActionType,
    runState: RunState,
    punishment: Punishment,
  ): boolean {
    const history = runState.actionHistory;
    const now = Date.now();

    // Quick sell curse: swap_sell within 60s after swap_buy
    if (punishment.id === 'quick_sell_curse' && action === 'swap_sell') {
      const lastBuy = [...history].reverse().find((a) => a.type === 'swap_buy');
      if (lastBuy) {
        const elapsed = now - new Date(lastBuy.timestamp).getTime();
        if (elapsed < 60_000) return true;
      }
    }

    // Quick LP exit: remove_liquidity within 60s after add_liquidity
    if (punishment.id === 'quick_lp_exit' && action === 'remove_liquidity') {
      const lastAdd = [...history].reverse().find((a) => a.type === 'add_liquidity');
      if (lastAdd) {
        const elapsed = now - new Date(lastAdd.timestamp).getTime();
        if (elapsed < 60_000) return true;
      }
    }

    return false;
  }

  private isDangerousAction(action: ActionType, runState: RunState): boolean {
    const history = runState.actionHistory;
    const now = Date.now();

    // Buy then immediate sell
    if (action === 'swap_sell') {
      const lastBuy = [...history].reverse().find((a) => a.type === 'swap_buy');
      if (lastBuy) {
        const elapsed = now - new Date(lastBuy.timestamp).getTime();
        if (elapsed < 60_000) return true;
      }
    }

    // Remove LP too quickly
    if (action === 'remove_liquidity') {
      const lastAdd = [...history].reverse().find((a) => a.type === 'add_liquidity');
      if (lastAdd) {
        const elapsed = now - new Date(lastAdd.timestamp).getTime();
        if (elapsed < 60_000) return true;
      }
    }

    return false;
  }
}
