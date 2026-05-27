# Pages and User Flows

## Page Map

```text
Home / Agent Lobby
  -> Create Agent
    -> AI Generation / Design Review (creator sees full path)
      -> Publish Confirmation
  -> Agent Detail
    -> Run Interaction
      -> Completion / Score Breakdown / Leaderboard
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
- Pool pair (e.g. DRAGON / QUSD)
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

Purpose: let creators describe an Agent dungeon. MVP: free to create.

Inputs:
- Agent name
- Agent persona
- Theme
- Agent token symbol (derived from Agent role name by default)
- Difficulty
- Hint style (riddle, direct, humorous)
- Initial prize pool in QUSD (optional, minimum 0)
- Desired player experience
- Optional forbidden content / tone constraints

Primary action:
- `Generate Agent`

After submit:
- Backend calls LLM Adapter to generate quest
- Generated private rule is stored server-side
- Public preview is prepared
- Creator moves to AI Generation / Design Review

## 3. AI Generation / Design Review

Purpose: show that AI designed a dungeon. Creator-only view shows the complete generated path before publishing; player-facing pages never reveal it.

Visible to creator:
- Agent public profile
- Opening prophecy (riddle-style)
- Visible stage names
- **Full hidden path** (creator-only, with world-language mapping)
- Difficulty summary
- Validation status (pass/fail)
- Rule hash, Solution hash
- Punishment/blessing rules
- Hint ladder preview

Hidden from player/public UI:
- Full hidden action order
- Exact transition conditions
- Exact punishment trigger thresholds

Internal generated assets:
- publicProfile
- privateRule
- hintLadder
- feedbackTemplates
- validationCases
- ruleHash
- solutionHash

Primary actions:
- `Regenerate`
- `Edit prompt`
- `Continue to publish`

## 4. Publish Confirmation

Purpose: confirm final public metadata and deploy/register the Agent.

Shows:
- Agent role token (e.g. Dragon -> DRAGON)
- Pool pair (DRAGON / QUSD)
- Hook deployment plan
- Rule hash, Solution hash
- Creation cost: Free (MVP)

On confirm:
- Deploy Agent token
- Deploy or configure Hook
- Initialize Uniswap V4 AgentToken/QUSD pool
- Register Agent on-chain and in database
- Show contract addresses and explorer links

## 5. Agent Detail

Purpose: give players enough context to decide whether to enter.

Shows:
- Agent persona and theme
- Opening prophecy (riddle-style)
- Visible stages
- Entry fee (5 QUSD)
- Prize pool
- Difficulty
- Public actions available: Swap, Add LP, Remove LP, Donate, Hold, Ask Agent
- Leaderboard summary
- Recent attempts
- Rule hash and Solution hash

Primary action:
- `Start Run`

Must not show:
- Correct action sequence
- Step-operation mapping

## 6. Run Interaction

Purpose: solve the active dungeon through player action and Agent riddle feedback.

Layout:
- Left: AMM action controls
- Center: visible stage progress
- Right: Agent conversation and run status

Actions:
- Swap AgentToken/QUSD (Buy / Sell)
- Add LP
- Remove LP
- Donate QUSD
- Hold (wait for condition)
- Ask Agent (paid hint)

After each action:
1. Player submits or confirms transaction.
2. Hook emits event.
3. Backend indexes or receives action.
4. Rule Engine evaluates action against hidden rule.
5. LLM Adapter generates riddle-style free feedback (or fallback template).
6. UI updates visible state.

Key behavior:
- Free feedback is riddle-style, never directly confirms correct/incorrect
- Player must accumulate signals across multiple actions to determine direction
- `[?]` status shown when action is "possibly related but not confirmed"
- `[!]` status shown when player is in danger state

Hint flow:
1. Player selects hint level.
2. UI shows cost in QUSD and score penalty.
3. Player pays QUSD.
4. Backend/Hook records hint.
5. LLM Adapter generates hint (or fallback from hintLadder).
6. Agent returns riddle-style hint without directly exposing full solution.

Completion:
- Hook emits QuestCompleted.
- Backend calculates Quest Score (7 components).
- Leaderboard updates.
- Player sees score breakdown and ranking.

Score breakdown shown:
- Completion Score
- Net Worth Score
- Time Score
- Efficiency Score
- LP Contribution Score
- Hint Penalty
- Curse Penalty
- Total Quest Score
