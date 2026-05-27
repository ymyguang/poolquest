# Pages and User Flows

## Page Map

```text
Home / Agent Lobby
  -> Create Agent
    -> AI Generation / Design Review
      -> Publish Confirmation
  -> Agent Detail
    -> Run Interaction
      -> Completion / Leaderboard
```

## 1. Home / Agent Lobby

Purpose: help users discover existing Agent dungeons and understand their wallet state.

Must show:

- Wallet connect and X Layer status
- User balances: QUSD, Agent tokens, LP positions summary
- Agent cards
- Create Agent entry

Agent card fields:

- Agent name
- Agent visual/avatar
- Theme
- Pool pair, e.g. `DRAGON / QUSD`
- Entry fee in QUSD
- Prize pool in QUSD
- Difficulty
- Active players
- Clear count
- Creator
- Season timer

Primary actions:

- `Enter Agent`
- `Create Agent`

Must not show:

- Hidden solution path
- Exact step-operation mapping

## 2. Create Agent

Purpose: let creators describe an Agent dungeon and pay creation cost.

Creation plus minimum initial prize pool:

```text
100 QUSD = 20 QUSD platform creation fee + 80 QUSD minimum initial prize pool
```

Inputs:

- Agent name
- Agent persona
- Theme
- Agent token symbol, derived from the Agent role name by default
- Difficulty
- Initial prize pool in QUSD
- Hint style
- Desired player experience
- Optional forbidden content / tone constraints

Primary action:

- `Generate Agent`

After submit:

- Backend calls AI Rule Generator
- Generated private rule is stored server-side
- Public preview is prepared
- Creator moves to AI Generation / Design Review

## 3. AI Generation / Design Review

Purpose: show that AI designed a dungeon. In the creator-only flow, the creator may inspect the complete generated path before publishing; player-facing pages must never reveal it.

Visible to creator:

- Agent public profile
- Opening prophecy
- Visible stage names
- Difficulty summary
- Validation status
- Rule hash
- Solution hash
- Economic settings

Hidden from creator UI:

- Nothing by default in the creator-only management view. The creator may inspect the full hidden path, transition conditions, and generated punishment rules.

Hidden from player/public UI:

- Full hidden action order
- Exact transition conditions
- Exact punishment trigger thresholds, unless intentionally exposed as public rules

Internal generated assets:

- `publicProfile`
- `privateRule`
- `hintLadder`
- `validationCases`
- `ruleHash`
- `solutionHash`

Primary actions:

- `Regenerate`
- `Edit prompt`
- `Continue to publish`

## 4. Publish Confirmation

Purpose: confirm final public metadata and deploy/register the Agent.

Shows:

- Creation package: `100 QUSD`
- Platform creation fee: `20 QUSD`
- Included minimum initial prize pool: `80 QUSD`
- Agent role token, e.g. `Dragon -> DRAGON`
- Pool pair
- Hook deployment plan
- Rule hash
- Solution hash

On confirm:

- Charge creator `100 QUSD` (`20 QUSD` platform creation fee + `80 QUSD` minimum initial prize pool)
- Deploy Agent token if needed
- Deploy or configure Hook
- Initialize Uniswap V4 AgentToken/QUSD pool
- Register Agent on-chain and in database

## 5. Agent Detail

Purpose: give players enough context to decide whether to enter.

Shows:

- Agent persona and theme
- Opening prophecy
- Visible stages
- Entry fee
- Prize pool
- Difficulty
- Public actions available: Swap, Add LP, Remove LP, Donate, Hold, Ask Agent
- Leaderboard
- Recent attempts
- Rule hash and Solution hash

Primary action:

- `Start Run`

Must not show:

- Correct action sequence
- Step-operation mapping

## 6. Run Interaction

Purpose: solve the active dungeon through player action and Agent feedback.

Layout:

- Left: AMM action controls
- Center: visible stage progress
- Right: Agent conversation and run status

Actions:

- Swap AgentToken/QUSD
- Add LP
- Remove LP
- Donate QUSD
- Hold
- Ask Agent

After each action:

1. Player submits or confirms transaction.
2. Hook emits event.
3. Backend indexes or receives action.
4. Rule Engine evaluates action against hidden rule.
5. Agent Response Service generates free fuzzy feedback.
6. UI updates visible state.

Hint flow:

1. Player selects hint level.
2. UI shows cost in QUSD and score penalty.
3. Player pays QUSD.
4. Backend/Hook records hint.
5. Agent returns hint text without directly exposing full solution.

Completion:

- Hook emits `QuestCompleted`
- Backend indexes score
- Leaderboard updates
- Player sees score breakdown and claimable reward status
