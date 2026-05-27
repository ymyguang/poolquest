# System Architecture

## High-level Components

```text
Frontend
  -> Backend API
    -> Rule Engine
    -> AI Services (LLM Adapter)
    -> Database
    -> Deployment Service
    -> Chain Indexer
  -> X Layer RPC
    -> PoolQuest contracts
    -> Uniswap V4 PoolManager
```

## Frontend Responsibilities

- Render pages and wallet state
- Show public Agent metadata
- Collect creator prompts
- Collect player actions
- Display Agent riddle feedback
- Display visible progress and leaderboard
- Never store or receive hidden solution paths

## Backend API Responsibilities

- Authenticate wallet sessions
- Manage Agent creation workflow
- Call LLM Adapter for quest generation
- Call LLM Adapter for riddle feedback and hints
- Store private rules
- Serve public Agent metadata
- Create and manage Runs
- Evaluate player actions with Rule Engine
- Calculate Quest Score
- Coordinate deployments
- Index chain events

## Rule Engine Responsibilities

The Rule Engine is the backend core that evaluates player actions against hidden rules.

It receives:
- Agent private rule (hidden path + punishments + blessings)
- Current run state (progress, action history, timing)
- Last player action (type, tx hash, timing)
- Chain transaction metadata

It returns:
- progress delta (which step advanced)
- feedback intent (what happened, in abstract terms)
- curse/blessing status
- score delta
- completion status
- mustNotReveal list (what AI must not say)

The Rule Engine is deterministic — same input always produces same output. AI is only used to translate the output into riddle-style language.

## AI / LLM Adapter Responsibilities

AI has two separate roles, both behind the LLM Adapter interface:

### 1. Quest Generation (Creator Flow)

From creator prompt, generates:
- publicProfile: opening prophecy, visible stage names, agent persona
- privateRule: hidden path, punishments, blessings, hint ladder, validation cases
- ruleHash, solutionHash

Output is validated by Rule Engine simulation before storage.

### 2. Narrative Response (Player Flow)

Converts Rule Engine evaluation into riddle-style Agent text:
- Free feedback after each action
- Paid hints at 3 levels (vague → near-answer)

AI must not be the source of truth for quest progress. If AI fails, backend returns deterministic fallback text from templates.

### LLM Adapter Interface

```typescript
interface LLMAdapter {
  generateQuest(prompt: CreatorPrompt): Promise<GeneratedQuest>
  generateFeedback(ctx: FeedbackContext): Promise<string>
  generateHint(ctx: HintContext): Promise<string>
}
```

Implementations:
- OpenAI adapter
- Claude adapter
- Local model adapter
- Deterministic fallback adapter (for dev/demo)

## Hook Responsibilities

The Hook records verifiable gameplay state on X Layer. Full hidden rule evaluation is backend-owned; Hook provides action/progress/hint/completion events and cryptographic commitments.

It should:
- Bind to an AgentToken/QUSD pool
- Record player AMM actions (afterSwap, afterAddLiquidity, afterRemoveLiquidity, afterDonate)
- Record progress updates submitted by authorized gameplay service
- Record hint purchases
- Record penalties/curses
- Emit events for backend indexer
- Emit completion and score events
- Store ruleHash and solutionHash commitments

It should not:
- Generate Agent text
- Call AI
- Store the full hidden path
- Expose hidden solution in plain form

## Chain Indexer Responsibilities

The indexer watches X Layer events and updates the database.

Events:
- `AgentRegistered`
- `RunStarted`
- `ActionRecorded`
- `ProgressUpdated`
- `HintPurchased`
- `CurseApplied`
- `QuestCompleted`
- `PrizeClaimed`

### Chain Indexer Adapter Interface

```typescript
interface ChainIndexerAdapter {
  startListening(agentId: string): Promise<void>
  onEvent(callback: (event: ChainEvent) => void): void
  getIndexedEvents(runId: string): Promise<ChainEvent[]>
}
```

## Deployment Service Responsibilities

For each published Agent:
- Deploy Agent token (derive symbol from Agent name, e.g. Dragon → DRAGON)
- Mine/deploy Hook address with required Uniswap V4 permission flags
- Initialize Uniswap V4 AgentToken/QUSD pool
- Register Agent in PoolQuestRegistry
- Store deployment metadata
- Expose explorer links

### Deploy Adapter Interface

```typescript
interface DeployAdapter {
  deployAgentToken(symbol: string, name: string): Promise<Address>
  deployHook(agentId: string): Promise<Address>
  initializePool(tokenA: Address, tokenB: Address, hook: Address): Promise<PoolId>
  registerAgent(agentId: string, token: Address, hook: Address, poolId: PoolId, ruleHash: string, solutionHash: string): Promise<TxHash>
  getDeploymentMetadata(agentId: string): Promise<DeploymentMetadata>
}
```

## Database Responsibilities

- Durable storage for Agent metadata
- Private hidden rules
- Run state
- Player actions
- AI messages
- Hint purchases
- Deployment records
- Leaderboard entries
- Indexed contract events

## Adapter Layer Summary

All external dependencies are behind adapter interfaces:

| Adapter | Responsibility | MVP Implementation |
|---|---|---|
| LLMAdapter | Quest generation + riddle feedback | OpenAI/Claude + fallback |
| HookAdapter | Chain interaction (read/write) | ethers.js + X Layer RPC |
| ChainIndexerAdapter | Event listening | Polling-based indexer |
| DeployAdapter | Contract deployment | ethers.js + deploy scripts |
| DatabaseAdapter | Persistence | PostgreSQL |

Backend business logic depends only on interfaces, not implementations. This enables:
- Mock adapters for development/testing
- LLM provider switching without code changes
- Chain switching by swapping HookAdapter
- Database switching by swapping DatabaseAdapter
