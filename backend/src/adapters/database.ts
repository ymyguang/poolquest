/** In-memory database adapter for MVP. Swap for PostgreSQL in production. */

import type {
  Agent, AgentPublicProfile, AgentPrivateRule, AgentDeployment,
  Run, RunAction, LeaderboardEntry,
} from '../types/index.js';

export interface DatabaseAdapter {
  // Agent
  createAgent(agent: Agent): Promise<Agent>;
  getAgent(id: string): Promise<Agent | null>;
  getAgentBySlug(slug: string): Promise<Agent | null>;
  listAgents(): Promise<Agent[]>;
  updateAgent(id: string, patch: Partial<Agent>): Promise<Agent>;

  // Public profile
  getPublicProfile(agentId: string): Promise<AgentPublicProfile | null>;
  setPublicProfile(profile: AgentPublicProfile): Promise<void>;

  // Private rule
  getPrivateRule(agentId: string): Promise<AgentPrivateRule | null>;
  setPrivateRule(rule: AgentPrivateRule): Promise<void>;

  // Deployment
  getDeployment(agentId: string): Promise<AgentDeployment | null>;
  setDeployment(deployment: AgentDeployment): Promise<void>;

  // Run
  createRun(run: Run): Promise<Run>;
  getRun(id: string): Promise<Run | null>;
  updateRun(id: string, patch: Partial<Run>): Promise<Run>;
  listRunsByAgent(agentId: string): Promise<Run[]>;

  // Actions
  addAction(action: RunAction): Promise<RunAction>;
  listActions(runId: string): Promise<RunAction[]>;

  // Leaderboard
  upsertLeaderboard(entry: LeaderboardEntry): Promise<void>;
  getLeaderboard(agentId: string): Promise<LeaderboardEntry[]>;
}

// ─── In-Memory Implementation ────────────────────────────────────────

export class InMemoryDatabase implements DatabaseAdapter {
  private agents = new Map<string, Agent>();
  private profiles = new Map<string, AgentPublicProfile>();
  private rules = new Map<string, AgentPrivateRule>();
  private deployments = new Map<string, AgentDeployment>();
  private runs = new Map<string, Run>();
  private actions = new Map<string, RunAction[]>();
  private leaderboards = new Map<string, LeaderboardEntry[]>();

  // Agent
  async createAgent(agent: Agent): Promise<Agent> {
    this.agents.set(agent.id, { ...agent });
    return agent;
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.get(id) ?? null;
  }

  async getAgentBySlug(slug: string): Promise<Agent | null> {
    for (const a of this.agents.values()) {
      if (a.slug === slug) return a;
    }
    return null;
  }

  async listAgents(): Promise<Agent[]> {
    return [...this.agents.values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  async updateAgent(id: string, patch: Partial<Agent>): Promise<Agent> {
    const existing = this.agents.get(id);
    if (!existing) throw new Error(`Agent ${id} not found`);
    const updated = { ...existing, ...patch };
    this.agents.set(id, updated);
    return updated;
  }

  // Public profile
  async getPublicProfile(agentId: string): Promise<AgentPublicProfile | null> {
    return this.profiles.get(agentId) ?? null;
  }

  async setPublicProfile(profile: AgentPublicProfile): Promise<void> {
    this.profiles.set(profile.agentId, { ...profile });
  }

  // Private rule
  async getPrivateRule(agentId: string): Promise<AgentPrivateRule | null> {
    return this.rules.get(agentId) ?? null;
  }

  async setPrivateRule(rule: AgentPrivateRule): Promise<void> {
    this.rules.set(rule.agentId, { ...rule });
  }

  // Deployment
  async getDeployment(agentId: string): Promise<AgentDeployment | null> {
    return this.deployments.get(agentId) ?? null;
  }

  async setDeployment(deployment: AgentDeployment): Promise<void> {
    this.deployments.set(deployment.agentId, { ...deployment });
  }

  // Run
  async createRun(run: Run): Promise<Run> {
    this.runs.set(run.id, { ...run });
    this.actions.set(run.id, []);
    return run;
  }

  async getRun(id: string): Promise<Run | null> {
    return this.runs.get(id) ?? null;
  }

  async updateRun(id: string, patch: Partial<Run>): Promise<Run> {
    const existing = this.runs.get(id);
    if (!existing) throw new Error(`Run ${id} not found`);
    const updated = { ...existing, ...patch };
    this.runs.set(id, updated);
    return updated;
  }

  async listRunsByAgent(agentId: string): Promise<Run[]> {
    return [...this.runs.values()]
      .filter((r) => r.agentId === agentId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  // Actions
  async addAction(action: RunAction): Promise<RunAction> {
    const list = this.actions.get(action.runId) ?? [];
    list.push({ ...action });
    this.actions.set(action.runId, list);
    return action;
  }

  async listActions(runId: string): Promise<RunAction[]> {
    return (this.actions.get(runId) ?? []).map((a) => ({ ...a }));
  }

  // Leaderboard
  async upsertLeaderboard(entry: LeaderboardEntry): Promise<void> {
    // Stored externally via agentId key — upserted per wallet
    // This is a simplified in-memory version
    const key = `__lb__${entry.wallet}`;
    const existing = this.leaderboards.get(key);
    if (!existing) {
      this.leaderboards.set(key, [{ ...entry }]);
    } else {
      const idx = existing.findIndex((e) => e.wallet === entry.wallet);
      if (idx >= 0 && existing[idx].score < entry.score) {
        existing[idx] = { ...entry };
      } else if (idx < 0) {
        existing.push({ ...entry });
      }
    }
  }

  async getLeaderboard(agentId: string): Promise<LeaderboardEntry[]> {
    const results: LeaderboardEntry[] = [];
    for (const entries of this.leaderboards.values()) {
      for (const e of entries) {
        // We don't store agentId in the key for this simplified version
        // In production, use a proper query
        results.push({ ...e });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 50);
  }
}
