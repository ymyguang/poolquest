/** PoolQuest backend entry point. */

import express from 'express';
import { config } from './config.js';
import { InMemoryDatabase } from './adapters/database.js';
import { createLLMAdapter } from './adapters/llm.js';
import { RuleEngine } from './core/rule-engine.js';
import { AgentService } from './core/agent-service.js';
import { RunService } from './core/run-service.js';
import { createAgentRouter } from './routes/agents.js';
import { createRunRouter } from './routes/runs.js';
import { errorHandler } from './middleware/error-handler.js';
import crypto from 'node:crypto';

async function main() {
  // Initialize adapters
  const db = new InMemoryDatabase();
  const llm = createLLMAdapter();
  const engine = new RuleEngine();

  // Initialize services
  const agentService = new AgentService(db, llm);
  const runService = new RunService(db, llm, engine);

  // Seed a default Dragon Agent for demo
  await seedDragonAgent(agentService);

  // Create Express app
  const app = express();
  app.use(express.json());

  // CORS for frontend dev
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', chainId: config.chainId });
  });

  // Routes
  app.use('/api/agents', createAgentRouter(agentService));
  app.use('/api', createRunRouter(runService));

  // Error handler
  app.use(errorHandler);

  // Start server
  app.listen(config.port, () => {
    console.log(`[PoolQuest] Backend running on http://localhost:${config.port}`);
    console.log(`[PoolQuest] Chain ID: ${config.chainId}`);
    console.log(`[PoolQuest] LLM Provider: ${config.llmProvider}`);
  });
}

async function seedDragonAgent(agentService: AgentService) {
  const demoCreator = process.env.DEMO_CREATOR_ADDRESS || '0x000000000000000000000000000000000000dEaD';
  const result = await agentService.generate(demoCreator, {
    name: 'Dragon',
    theme: 'A dragon guarding a treasure pool in an ancient cave',
    persona: 'Ancient, proud, speaks in riddles',
    difficulty: 'medium',
    hintStyle: 'riddle',
    initialPrizePoolQusd: 200,
  });

  try {
    await agentService.publish(result.agent.id, demoCreator);
    console.log(`[PoolQuest] Seeded published Dragon Agent: ${result.agent.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown publish error';
    console.warn(`[PoolQuest] Seeded Dragon Agent as draft only: ${message}`);
  }
}

main().catch((err) => {
  console.error('[PoolQuest] Fatal error:', err);
  process.exit(1);
});
