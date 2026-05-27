# Rules Conformance Review

This document checks the current product/architecture plan against `玩法.md` V1.0 and competition requirements.

## Conforms

### Core Gameplay
- Agent dungeon concept: creators create Agent quests, players solve through AMM actions, Agent gives riddle feedback, Hook records verifiable state.
- Agent pool model: `AgentToken / QUSD`, each Agent creates a real role token.
- Run actions: Swap, Add LP, Remove LP, Donate, Hold, Ask Agent.
- Opening prophecy: riddle-style, hints at first 1-2 steps only, never names operations directly.
- Free feedback: riddle-style, never directly confirms correct/incorrect, player must accumulate signals.
- Paid hints: 3 levels (direction → range → near-answer), escalating cost and score penalty.
- Leaderboard: Quest Score, one entry per wallet per Agent.
- LLM-generated content: hidden paths, prophecies, feedback, hints, stage names — all dynamic, not fixed templates.

### Economic Model
- Entry Fee: 5 QUSD, split 60% prize pool / 20% platform / 10% creator / 10% protection fund.
- Hint Fee: 100% to prize pool (increases pool for non-hint players).
- Hook Fee: 0.05%, 100% to platform (MVP simplified).
- Creator creation: free in MVP (no 100 QUSD cost).
- Cold start: platform injects 200 QUSD seed prize pool.
- Player P&L: maximum loss ~5.5 QUSD (entry + gas), acceptable entertainment cost.

### Technical
- Hidden path: stored in backend, never exposed in frontend or public API.
- Creator can see full path; players cannot.
- Rule Engine: deterministic, evaluates actions against hidden rules.
- LLM Adapter: behind interface, with deterministic fallback.
- Hook: records events, stores ruleHash/solutionHash, does not store full path.
- Adapter layer: all external dependencies behind interfaces.

### Competition Alignment
- Hook innovation: afterSwap/afterAddLiquidity/afterRemoveLiquidity/afterDonate repurposed as game state recorders.
- Hook events: indexable game events (progress, hints, completion, scores).
- X Layer deployment: V4 Pool + Hook with verifiable addresses.

## Removed from V0.1 (intentional simplifications)

| V0.1 Feature | Status | Reason |
|---|---|---|
| 100 QUSD creation fee | Removed | MVP needs content, free creation encourages it |
| Creator Escrow 5-stage release | Removed | Too complex for MVP, no dispute scenario yet |
| Anti-wash penalty | Removed | Single Run context doesn't need it |
| LP Guardian rewards | Removed | No LP Guardian role in MVP |
| Protection fund complex rules | Simplified | Only basic refund logic |
| Hook Fee 4-way split | Simplified | 100% to platform for MVP |
| Season reward settlement | Removed | Single period, direct distribution |
| Creator reputation bond | Removed | Free creation, no bond needed |
| Multi-Agent support | Deferred | One Agent (Dragon) for MVP, architecture supports many |

## Remaining Implementation Gaps

- Score formula implementation: all 7 components must match defined formulas.
- LLM prompt engineering: riddle constraints, world-language templates, guardrails against solution leakage.
- Rule Engine simulation: validate generated paths before publish.
- Indexer reconciliation: backend Run state must match Hook events.
- Fee split implementation: Entry Fee → 4 destinations.
- Leaderboard: per-Agent, one entry per wallet, best score only.

## Wording Policy

Use `QUSD platform token` in public docs and UI. Avoid `stablecoin`, `USD-pegged`, or externally stable language. QUSD is PoolQuest's own platform coin.
