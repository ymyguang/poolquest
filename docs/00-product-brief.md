# PoolQuest Product Brief

## One-line

PoolQuest is an on-chain Agent dungeon platform where creators use prompts to create AI-designed AMM quests, players use real Uniswap V4 pool actions to solve hidden riddle paths, and Hook contracts record verifiable progress on X Layer.

## Core Concept

Creator describes the world. LLM generates the hidden quest path, riddle feedback, and hint ladder. Backend stores the private rule. Hook records verifiable state and progress events on X Layer. Player discovers the path through AMM actions and Agent riddle feedback.

## Platform Currency

`QUSD` is the PoolQuest platform coin.

It is the common unit for:
- Player entry fee
- Standard challenge budget
- Donate action
- Agent hint fee
- Prize pool
- Platform fees
- Player protection fund

Every Agent pool is:

```text
AgentToken / QUSD
```

Each published Agent creates or binds a real Agent role token. The Agent token is the main asset of that dungeon pool, named from the Agent identity by LLM.

## Primary Roles

### Creator

Creates an Agent dungeon by providing a theme and intent prompt. **Free to create in MVP.** The system calls LLM to generate a complete hidden quest, then validates it can be completed before publishing.

Creator can see the complete hidden path for their own Agent in a creator-only management view. Players never receive the hidden action path directly.

### Player

Selects an Agent, pays 5 QUSD entry fee, and interacts with the AgentToken/QUSD pool through Swap, Add LP, Remove LP, Donate, Hold, and Ask Agent.

Player never receives the hidden action path directly. They explore through trial and error, guided by riddle-like feedback.

### Agent

The Agent is the narrative interface. It gives:
- Opening prophecy (riddle, hints at first 1-2 steps only)
- Free fuzzy riddle feedback after each action (never confirms correct/incorrect)
- Paid hints with escalating cost and score penalty (from vague to near-answer)

The Agent does not decide whether a player succeeded. Rule Engine and Hook state do.

### Hook

The Hook is the verifiable AMM rule surface. It records player actions, progress events, hints, completion, and rule/solution hash commitments on X Layer. Full hidden rules live in the backend; Hook provides the on-chain proof layer.

## Economic Model (MVP)

### Entry Fee: 5 QUSD

| Destination | Share |
|---|---|
| Prize Pool | 60% (3 QUSD) |
| Platform | 20% (1 QUSD) |
| Creator Revenue | 10% (0.5 QUSD) |
| Protection Fund | 10% (0.5 QUSD) |

### Hook Fee: 0.05% per swap

MVP: 100% to platform.

### Hint Fee: paid in QUSD

MVP: 100% goes to prize pool. Using hints increases the prize pool, benefiting non-hint players.

### Cold Start

Platform injects 200 QUSD seed prize pool for the first period.

### Player P&L

Players know upfront: maximum loss is ~5.5 QUSD (entry fee + gas). This is acceptable entertainment cost.

## Product Promise

Players should feel they are solving a living on-chain riddle through exploration, not following a visible checklist. The LLM generates unique riddle-style content for every Agent, so no two dungeons feel the same. The UI exposes mystery, state, cost, and feedback, while hiding the solution.

## Competition Alignment

PoolQuest demonstrates Uniswap V4 Hook innovation by repurposing `afterSwap`, `afterAddLiquidity`, `afterRemoveLiquidity`, and `afterDonate` as game state recorders — not just DeFi interceptors. Hook events become indexable game events (progress, hints, completion, scores), creating a new category of application-layer Hook usage on X Layer.
