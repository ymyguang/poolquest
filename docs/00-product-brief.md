# PoolQuest Product Brief

## One-line

PoolQuest is an on-chain Agent dungeon platform where creators spend QUSD to create AI-designed AMM quests, players use real Uniswap V4 pool actions to solve hidden paths, and Hook contracts record verifiable progress on X Layer.

## Core Concept

Creator designs the world. AI generates the hidden quest. Backend stores the private rule. Hook records verifiable state, progress events, and rule commitments on X Layer. Player discovers the path through AMM actions and Agent feedback.

## Platform Currency

`QUSD` is the PoolQuest platform coin.

It is not an external stablecoin in this product design. It is the common unit for:

- Agent creation cost
- Player entry fee
- Standard challenge budget
- Donate action
- Agent hint fee
- Prize pool
- Creator escrow
- Platform fees
- Player protection fund

Every Agent pool is:

```text
AgentToken / QUSD
```

Each published Agent must create or bind a real Agent role token. The Agent token is the main asset of that dungeon pool and should be named from the Agent identity.

Examples:

```text
Dragon Agent -> DRAGON / QUSD
Witch Agent  -> WITCH / QUSD
Monk Agent   -> MONK / QUSD
Devil Agent  -> DEVIL / QUSD
```

## Primary Roles

### Creator

Creates an Agent dungeon by providing a theme and intent prompt. Pays `100 QUSD` to create and publish an Agent. This amount is split into `20 QUSD` platform creation fee and `80 QUSD` minimum initial prize pool for MVP.

Creator can see the complete hidden path for their own Agent in a creator-only management view. Players never receive the hidden action path directly.

### Player

Selects an Agent, pays entry fee in QUSD, and interacts with the AgentToken/QUSD pool through Swap, Add LP, Remove LP, Donate, Hold, and Ask Agent.

Player never receives the hidden action path directly.

### Agent

The Agent is the narrative interface. It gives:

- Opening prophecy
- Free fuzzy feedback after each action
- Paid hints with escalating cost and score penalty

The Agent does not decide whether a player succeeded. Rule Engine and Hook state do.

### Hook

The Hook is the verifiable AMM rule surface. MVP hidden rules live in the backend; Hook records key player actions, progress events, punishments, hints, completion events, and `ruleHash/solutionHash` commitments on X Layer.

## Product Promise

Players should feel they are solving a living on-chain riddle, not following a visible checklist. The UI should expose mystery, state, cost, and feedback, while hiding the solution.
