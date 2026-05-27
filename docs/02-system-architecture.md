# System Architecture

## High-level Components

```text
Frontend
  -> Backend API
    -> AI Services
    -> Database
    -> Rule Engine
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
- Display Agent feedback
- Display visible progress and leaderboard
- Never store or receive hidden solution paths

## Backend API Responsibilities

- Authenticate wallet sessions
- Manage Agent creation workflow
- Call AI Rule Generator
- Store private rules
- Serve public Agent metadata
- Create and manage Runs
- Evaluate player actions with Rule Engine
- Generate Agent feedback and paid hints
- Coordinate deployments
- Index chain events

## Database Responsibilities

- Durable storage for Agent metadata
- Private hidden rules
- Run state
- Player actions
- AI messages
- hint purchases
- deployment records
- leaderboard entries
- indexed contract events

## AI Responsibilities

AI has two separate roles:

1. **Rule generation**
   - Creates hidden path and Agent content from creator prompt.
   - Output is stored server-side.

2. **Narrative response**
   - Converts Rule Engine evaluation into fuzzy Agent text.
   - Does not decide success or failure.

AI must not be the source of truth for quest progress.

## Rule Engine Responsibilities

The Rule Engine is the backend mirror of Hook-compatible quest logic.

It receives:

- Agent private rule
- Current run state
- Last player action
- Chain transaction metadata

It returns:

- progress delta
- feedback intent
- curse/blessing status
- score delta
- completion status

## Hook Responsibilities

The Hook records verifiable gameplay state on X Layer. In MVP, full hidden rule evaluation is backend-owned; Hook provides action/progress/hint/completion events and cryptographic commitments.

It should:

- Bind to an AgentToken/QUSD pool
- Record player actions relevant to quest state
- Record progress updates submitted by the authorized gameplay/router service or encoded Hook checks, depending on the Agent deployment mode
- Record hint purchases
- Record penalties
- Emit events for backend indexer
- Emit completion and score events

It should not:

- Generate Agent text
- Call AI
- Store long prose
- Expose hidden solution in plain form
- Independently store the full hidden path

## Indexer Responsibilities

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

## Deployment Service Responsibilities

For each published Agent:

- Deploy Agent token or clone from template
- Derive Agent token identity from the Agent role, e.g. Dragon -> DRAGON
- Mine/deploy Hook address with required Uniswap V4 permission flags
- Initialize Uniswap V4 pool
- Register Agent in `PoolQuestRegistry`
- Store deployment metadata
- Expose explorer links
