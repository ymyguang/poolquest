# Implementation Plan

## Phase 1: Reset Architecture Around System Boundaries

- Keep current prototype only as reference.
- Introduce real routing and page map.
- Introduce backend API as required runtime dependency.
- Remove any frontend-local hidden solution state.

## Phase 2: Backend + Database

- Add Node/TypeScript backend.
- Add PostgreSQL and migrations.
- Implement Agent, Run, Action, Hint, Deployment tables.
- Implement deterministic Dragon generator first.
- Add LLM adapter behind environment variables.

## Phase 3: Frontend Pages

- Build Agent lobby.
- Build Create Agent page.
- Build AI Design Review page.
- Build Publish Confirmation page.
- Build Agent Detail page.
- Build Run Interaction page.

## Phase 4: Contracts

- Replace prototype contracts with production-shaped contracts:
  - QUSD token
  - Agent token factory
  - registry
  - Hook
  - vaults
- Add tests around:
  - Agent registration
  - Hook permissions
  - run progress events
  - hint fee effects
  - completion events

## Phase 5: X Layer Deployment

- Deploy self-owned QUSD platform token.
- Deploy registry and vaults.
- Deploy Dragon Agent token and Hook.
- Initialize V4 pool.
- Store deployment metadata.
- Show verifiable addresses in app.

## Phase 6: QA and Demo

- Seed at least one published Agent.
- Run full browser demo.
- Verify no hidden path is exposed in API responses.
- Verify contracts compile and tests pass.
- Verify X Layer explorer links.

## Acceptance Criteria

- Frontend has at least five distinct product pages.
- Agent hidden path never appears in frontend bundle or public API.
- Creating Agent consumes or simulates `100 QUSD`, split as `20 QUSD` platform creation fee + `80 QUSD` minimum initial prize pool.
- Player interactions are judged by backend/Hook state, not frontend state.
- AI feedback is generated from Rule Engine evaluation.
- Published Agent has verifiable Hook and V4 Pool deployment metadata.
- README explains how to run and how to submit competition evidence.
