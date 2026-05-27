# Implementation Plan

## Phase 1: Reset Architecture Around System Boundaries

- Keep current prototype only as reference.
- Introduce real routing and page map (6 pages).
- Introduce backend API as required runtime dependency.
- Remove any frontend-local hidden solution state.
- Define adapter interfaces (LLM, Hook, ChainIndexer, Deploy, Database).

## Phase 2: Backend + Database

- Add Node/TypeScript backend.
- Add PostgreSQL and migrations.
- Implement Agent, Run, Action, Hint, Deployment tables.
- Implement deterministic Rule Engine first.
- Implement deterministic Dragon generator as LLM fallback.
- Add LLM adapter behind environment variables (OpenAI/Claude).

## Phase 3: Frontend Pages

- Build Agent lobby (card list, wallet, balances).
- Build Create Agent page (form + generate).
- Build AI Design Review page (creator sees full path).
- Build Publish Confirmation page (deploy + register).
- Build Agent Detail page (prophecy, stages, entry, leaderboard).
- Build Run Interaction page (AMM actions, progress, riddle feedback, hints, score).

## Phase 4: Contracts

- QUSD token.
- AgentToken factory.
- PoolQuestRegistry.
- PoolQuestHook (afterSwap, afterAddLiquidity, afterRemoveLiquidity, afterDonate).
- PrizeVault / FeeVault minimal version.
- Add tests around: Agent registration, Hook permissions, run progress events, hint fee effects, completion events.

## Phase 5: X Layer Deployment

- Deploy self-owned QUSD platform token.
- Deploy registry and vaults.
- Deploy Dragon Agent token and Hook.
- Initialize V4 pool.
- Store deployment metadata.
- Show verifiable addresses in app.

## Phase 6: QA and Demo

- Seed at least one published Agent (Dragon Pool).
- Run full browser demo (3-minute walkthrough).
- Verify no hidden path is exposed in API responses.
- Verify contracts compile and tests pass.
- Verify X Layer explorer links.
- Verify riddle feedback never directly confirms correct/incorrect.
- Verify score calculation matches formula.

## Acceptance Criteria

- Frontend has 6 distinct product pages.
- Agent hidden path never appears in frontend bundle or public API.
- Creating Agent is free in MVP.
- Player entry fee is 5 QUSD, split 60/20/10/10.
- Player interactions are judged by Rule Engine, not frontend state.
- AI feedback is riddle-style, generated from Rule Engine evaluation.
- AI failure falls back to deterministic templates.
- Published Agent has verifiable Hook and V4 Pool deployment metadata.
- Quest Score calculation matches defined formula.
- Leaderboard shows top 50 per Agent, one entry per wallet.
- README explains how to run and how to submit competition evidence.
