/** Agent routes. */

import { Router } from 'express';
import type { AgentService } from '../core/agent-service.js';
import { AppError } from '../middleware/error-handler.js';

export function createAgentRouter(service: AgentService): Router {
  const router = Router();

  // List agents (lobby)
  router.get('/', async (_req, res, next) => {
    try {
      const agents = await service.listAgents();
      res.json({ data: agents });
    } catch (err) {
      next(err);
    }
  });

  // Get agent detail
  router.get('/:id', async (req, res, next) => {
    try {
      const result = await service.getAgent(req.params.id);
      if (!result) throw new AppError(404, 'NOT_FOUND', 'Agent not found');
      const deployment = await service.getDeployment(result.agent.id);
      res.json({ data: { ...result, deployment } });
    } catch (err) {
      next(err);
    }
  });

  // Generate agent (creator flow)
  router.post('/generate', async (req, res, next) => {
    try {
      const { creatorAddress, name, theme, persona, difficulty, hintStyle, initialPrizePoolQusd } = req.body;
      if (!creatorAddress || !name || !theme) {
        throw new AppError(400, 'BAD_REQUEST', 'Missing required fields: creatorAddress, name, theme');
      }
      const result = await service.generate(creatorAddress, {
        name, theme,
        persona: persona || 'mysterious',
        difficulty: difficulty || 'medium',
        hintStyle: hintStyle || 'riddle',
        initialPrizePoolQusd: initialPrizePoolQusd || 0,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  });

  // Publish agent
  router.post('/:id/publish', async (req, res, next) => {
    try {
      const { creatorAddress } = req.body;
      if (!creatorAddress) throw new AppError(400, 'BAD_REQUEST', 'Missing creatorAddress');
      const agent = await service.publish(req.params.id, creatorAddress);
      res.json({ data: agent });
    } catch (err) {
      next(err);
    }
  });

  // Get private rule (creator only)
  router.get('/:id/private-rule', async (req, res, next) => {
    try {
      const creatorAddress = req.query.creator as string;
      if (!creatorAddress) throw new AppError(400, 'BAD_REQUEST', 'Missing creator address');
      const rule = await service.getPrivateRule(req.params.id, creatorAddress);
      if (!rule) throw new AppError(404, 'NOT_FOUND', 'Rule not found or not authorized');
      res.json({ data: rule });
    } catch (err) {
      next(err);
    }
  });

  // Get deployment metadata
  router.get('/:id/deployment', async (req, res, next) => {
    try {
      const deployment = await service.getDeployment(req.params.id);
      if (!deployment) throw new AppError(404, 'NOT_FOUND', 'Deployment not found');
      res.json({ data: deployment });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
