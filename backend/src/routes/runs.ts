/** Run routes. */

import { Router } from 'express';
import type { RunService } from '../core/run-service.js';
import { AppError } from '../middleware/error-handler.js';

export function createRunRouter(service: RunService): Router {
  const router = Router();

  // Start a run
  router.post('/agents/:agentId/runs', async (req, res, next) => {
    try {
      const { playerAddress } = req.body;
      if (!playerAddress) throw new AppError(400, 'BAD_REQUEST', 'Missing playerAddress');
      const run = await service.startRun(req.params.agentId, playerAddress);
      res.json({ data: run });
    } catch (err) {
      next(err);
    }
  });

  // Get run visible state
  router.get('/runs/:runId', async (req, res, next) => {
    try {
      const state = await service.getRunVisibleState(req.params.runId);
      if (!state) throw new AppError(404, 'NOT_FOUND', 'Run not found');
      res.json({ data: state });
    } catch (err) {
      next(err);
    }
  });

  // Submit action
  router.post('/runs/:runId/actions', async (req, res, next) => {
    try {
      const { actionType, payload, txHash } = req.body;
      if (!actionType) throw new AppError(400, 'BAD_REQUEST', 'Missing actionType');
      const result = await service.submitAction(
        req.params.runId, actionType, payload ?? {}, txHash,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // Purchase hint
  router.post('/runs/:runId/hints', async (req, res, next) => {
    try {
      const { level } = req.body;
      if (![1, 2, 3].includes(level)) {
        throw new AppError(400, 'BAD_REQUEST', 'Hint level must be 1, 2, or 3');
      }
      const hint = await service.purchaseHint(req.params.runId, level);
      res.json({ data: hint });
    } catch (err) {
      next(err);
    }
  });

  // Get score breakdown
  router.get('/runs/:runId/score', async (req, res, next) => {
    try {
      const score = await service.getScore(req.params.runId);
      res.json({ data: score });
    } catch (err) {
      next(err);
    }
  });

  // Get leaderboard
  router.get('/agents/:agentId/leaderboard', async (req, res, next) => {
    try {
      const entries = await service.getLeaderboard(req.params.agentId);
      res.json({ data: entries });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
