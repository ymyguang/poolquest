/** Agent Service — manages Agent creation, generation, publishing. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from '../adapters/database.js';
import type { LLMAdapter } from '../adapters/llm.js';
import type {
  Agent, AgentPublicProfile, AgentPrivateRule, AgentLobbyCard, AgentDeployment,
} from '../types/index.js';

type DeploymentFile = {
  network?: { chainId?: number };
  uniswapV4?: {
    poolManager?: string;
    poolId?: string;
    initializeTx?: string;
  };
  contracts?: {
    qusd?: string;
    dragon?: string;
    registry?: string;
    hook?: string;
    router?: string;
  };
};

const ZERO_POOL_ID = `0x${'0'.repeat(64)}`;

export class AgentService {
  constructor(
    private db: DatabaseAdapter,
    private llm: LLMAdapter,
  ) {}

  async listAgents(): Promise<AgentLobbyCard[]> {
    const agents = await this.db.listAgents();
    const published = agents.filter((a) => a.status === 'published');
    return Promise.all(published.map((a) => this.toLobbyCard(a)));
  }

  async getAgent(idOrSlug: string): Promise<{
    agent: Agent;
    profile: AgentPublicProfile;
  } | null> {
    let agent = await this.db.getAgent(idOrSlug);
    if (!agent) agent = await this.db.getAgentBySlug(idOrSlug);
    if (!agent) return null;

    const profile = await this.db.getPublicProfile(agent.id);
    if (!profile) return null;

    return { agent, profile };
  }

  async getPrivateRule(
    agentId: string,
    creatorAddress: string,
  ): Promise<AgentPrivateRule | null> {
    const agent = await this.db.getAgent(agentId);
    if (!agent || agent.creatorAddress !== creatorAddress) return null;
    return this.db.getPrivateRule(agentId);
  }

  async generate(
    creatorAddress: string,
    input: {
      name: string;
      theme: string;
      persona: string;
      difficulty: 'easy' | 'medium' | 'hard';
      hintStyle: string;
      initialPrizePoolQusd: number;
    },
  ): Promise<{ agent: Agent; profile: AgentPublicProfile }> {
    const slug = this.slugify(input.name);
    const existing = await this.db.getAgentBySlug(slug);
    const agentId = existing?.id ?? crypto.randomUUID();

    const { publicProfile, privateRule } = await this.llm.generateQuest(
      input.theme,
      input.name,
      input.difficulty,
    );

    const tokenSymbol = input.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'TOKEN';

    const agent: Agent = {
      id: agentId,
      creatorAddress,
      slug,
      name: input.name,
      theme: input.theme,
      persona: input.persona,
      tokenName: input.name,
      tokenSymbol,
      status: 'generated',
      difficulty: input.difficulty,
      hintStyle: input.hintStyle,
      entryFeeQusd: 5,
      prizePoolSeedQusd: input.initialPrizePoolQusd,
      currentPrizePoolQusd: input.initialPrizePoolQusd,
      ruleHash: this.hash(JSON.stringify(privateRule.hiddenPath)),
      solutionHash: this.hash(JSON.stringify(privateRule)),
      createdAt: new Date().toISOString(),
      publishedAt: null,
    };

    const profile: AgentPublicProfile = { agentId, ...publicProfile };
    const rule: AgentPrivateRule = { agentId, ...privateRule };

    await this.db.createAgent(agent);
    await this.db.setPublicProfile(profile);
    await this.db.setPrivateRule(rule);

    return { agent, profile };
  }

  async publish(
    agentId: string,
    creatorAddress: string,
  ): Promise<Agent> {
    const agent = await this.db.getAgent(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.creatorAddress !== creatorAddress) throw new Error('Not the creator');
    if (agent.status !== 'generated') throw new Error('Agent not in generated state');

    await this.db.setDeployment(this.loadXLayerDeployment(agentId));

    return this.db.updateAgent(agentId, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
  }

  async getDeployment(agentId: string) {
    return this.db.getDeployment(agentId);
  }

  private async toLobbyCard(agent: Agent): Promise<AgentLobbyCard> {
    const runs = await this.db.listRunsByAgent(agent.id);
    const activePlayers = runs.filter((r) => r.status === 'active').length;
    const clearCount = runs.filter((r) => r.status === 'completed').length;

    return {
      id: agent.id,
      name: agent.name,
      theme: agent.theme,
      tokenSymbol: agent.tokenSymbol,
      poolPair: `${agent.tokenSymbol}/QUSD`,
      entryFeeQusd: agent.entryFeeQusd,
      prizePoolQusd: agent.currentPrizePoolQusd,
      difficulty: agent.difficulty,
      activePlayers,
      clearCount,
      creatorAddress: agent.creatorAddress,
    };
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private hash(data: string): string {
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }

  private loadXLayerDeployment(agentId: string): AgentDeployment {
    const deployment = this.readDeploymentFile();
    const contracts = deployment.contracts ?? {};
    const uniswapV4 = deployment.uniswapV4 ?? {};

    if (
      !this.isAddress(contracts.qusd)
      || !this.isAddress(contracts.dragon)
      || !this.isAddress(contracts.hook)
      || !this.isAddress(contracts.registry)
      || !this.isAddress(uniswapV4.poolManager)
      || !this.isBytes32(uniswapV4.poolId)
      || uniswapV4.poolId === ZERO_POOL_ID
      || !this.isBytes32(uniswapV4.initializeTx)
    ) {
      throw new Error(
        'X Layer deployment metadata is incomplete. Run contracts/script/deploy-xlayer.mjs and verify deployments/xlayer-testnet.json before publishing.',
      );
    }

    return {
      agentId,
      chainId: deployment.network?.chainId ?? 1952,
      qusdTokenAddress: contracts.qusd,
      agentTokenAddress: contracts.dragon,
      poolManagerAddress: uniswapV4.poolManager,
      hookAddress: contracts.hook,
      registryAddress: contracts.registry,
      poolId: uniswapV4.poolId,
      initializeTxHash: uniswapV4.initializeTx,
      publishTxHash: uniswapV4.initializeTx,
    };
  }

  private readDeploymentFile(): DeploymentFile {
    const candidates = [
      path.resolve(process.cwd(), 'deployments/xlayer-testnet.json'),
      path.resolve(process.cwd(), '../deployments/xlayer-testnet.json'),
      path.resolve(process.cwd(), 'deployments/xlayer.json'),
      path.resolve(process.cwd(), '../deployments/xlayer.json'),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) throw new Error('deployments/xlayer-testnet.json not found');

    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as DeploymentFile;
  }

  private isAddress(value: string | undefined): value is string {
    return /^0x[a-fA-F0-9]{40}$/.test(value ?? '');
  }

  private isBytes32(value: string | undefined): value is string {
    return /^0x[a-fA-F0-9]{64}$/.test(value ?? '');
  }
}
