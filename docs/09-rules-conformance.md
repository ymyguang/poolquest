# Rules Conformance Review

This document checks the current product/architecture plan against `玩法.md` plus the latest decisions:

- QUSD is the platform token name.
- MVP rule boundary is backend-hidden full rule plus Hook event/commitment recording.
- `100 QUSD` is split into `20 QUSD` platform creation fee and `80 QUSD` minimum initial prize pool.
- Creator can see their own complete hidden path.
- QUSD is self-deployed for the demo.

## Conforms

- Agent dungeon concept matches: creators create Agent quests, players solve through AMM actions, Agent gives riddle-like feedback, Hook participates in rule execution/recording.
- Agent pool model remains `AgentToken / QUSD`, and each Agent creates/binds a real role token, e.g. `Dragon -> DRAGON / QUSD`.
- Run actions match the rules: Swap, Add LP, Remove LP, Donate, Hold, Ask Agent.
- Opening prophecy remains public and must hint without directly naming the exact action sequence.
- Free feedback exists after player actions and should be fuzzy, not answer-revealing.
- Paid hints exist, become more expensive, and apply score penalty.
- Leaderboard is based on Quest Score and best run per wallet.
- Prize pool, creator escrow, platform fees, and player protection fund remain QUSD-denominated.
- Hidden path examples such as Donate -> Add LP -> Buy -> Hold -> Sell are supported as generated private rules.
- X Layer deployment requirement is preserved: V4 Pool + Hook address must be verifiable.

## Decisions Now Reflected In `玩法.md`

- QUSD is now defined as `PoolQuest platform token`, not an external stablecoin or dollar-pegged asset.
- Hint fees are now paid directly in QUSD for MVP.
- MVP Hook boundary is now: backend stores/evaluates the complete hidden rule, while Hook records actions, progress, hints, completion, and hashes on X Layer. This protects hidden rules while still satisfying the V4 Hook competition requirement.
- Creating an Agent now costs `100 QUSD`, split into `20 QUSD` platform creation fee and `80 QUSD` minimum initial prize pool. Bond/reputation can be added later.
- Creator can view their own full path in authenticated creator-only UI; players cannot.

## Implementation Gaps To Preserve Full Rules

- Need explicit fee split implementation for entry fee, Hook fee, hint fee, creator escrow, platform treasury, prize pool, and player protection fund.
- Need score formula implementation: completion, treasure, net worth, time, efficiency, LP contribution, hint penalty, curse penalty, anti-wash penalty.
- Need anti-wash behavior: rapid swaps, same-block reverse swaps, fast LP exit, repeated hidden-event farming.
- Need creator lifecycle: review state, dispute handling, creator revenue unlock, bad quest penalties.
- Need season reward distribution and leaderboard payout logic.
- Need rule validation simulation before publish: completable within 15 minutes, minimum funds <= 100 QUSD, final net worth >= 95 QUSD, no unavoidable penalty.
- Need indexer and database reconciliation so backend Run state matches Hook events.

## Remaining Wording Decision

The current architecture is coherent under the latest decisions. One wording policy should stay explicit during implementation:

Use `QUSD platform token` in public docs and UI. Avoid `stablecoin`, `USD-pegged`, or externally stable language unless QUSD later becomes backed or pegged.
