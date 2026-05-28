# PoolQuest

PoolQuest is an on-chain Agent dungeon platform built on Uniswap V4 Hooks for X Layer.

> **Creators design riddles with prompts. LLM generates hidden quests. Players solve them through real AMM actions. Hook records everything on-chain.**

## Project Overview

PoolQuest explores V4 Hook as an application layer, not only a DeFi primitive. The project uses real X Layer Testnet transactions to turn AMM actions into game state: swap, donate, and liquidity operations trigger Hook callbacks and are reflected in the player run.

Because no official X Layer Testnet V4 PoolManager deployment was available during development, the project deployed v4-core PoolManager on X Layer Testnet and initialized the PoolQuest V4 Pool against it.

## How It Works

1. Creator describes an Agent dungeon with a prompt.
2. LLM generates hidden path, riddle prophecy, feedback templates, and hint ladder.
3. System deploys AgentToken + Hook + V4 Pool on X Layer.
4. Player pays 5 QUSD entry fee, gets 100 QUSD challenge budget.
5. Player explores through Swap, LP, Donate, Hold — guided by riddle feedback.
6. Completing the hidden path within 10 minutes with net worth ≥ 85 QUSD = success.
7. Leaderboard ranks players by Quest Score. Top 50 split the prize pool.

## Hackathon Alignment

PoolQuest is built for Hook the Future and maps to the judging rubric:

- Innovation: Hooks become a game-state engine where V4 callbacks are player actions rather than fee logic.
- Market value: The design targets repeatable on-chain activity by turning trading, LP, and donations into recurring quests and prize pools.
- Completion: Deployed Hook + Pool on X Layer Testnet with verifiable addresses; gameplay is triggered by real swaps and liquidity ops.
- Code quality: Deterministic rule engine drives progression; LLM only renders riddle-style narrative.

## X Layer Testnet Deployment

- PoolManager: `0xd31e381a9475e1952d86b43042abfe5713b2f536`
- PoolQuestHook: `0x7E51c8E4c3F9F4854d0DAeaCAb4237bD2563C550`
- Router: `0xa47e5be41ea97987a3cf7e658fc5500e99b0a420`
- V4 Pool ID: `0x868817845dbd762a6c5138cfcd9dda1f0c2f6a760e47a18bd860da50d98677a3`
- Initialize Tx: `0x9fe67e1460992203d72920d055ff9fd4ec5806c56092f0f6eb7b80d80b5b69bf`

## Project Structure

```
contracts/     Solidity contracts + X Layer deployment
backend/       API server, Rule Engine, LLM adapter
frontend/      Vite React app with 6 product pages
docs/          Full product spec (10 documents)
deployments/   Deployment metadata (xlayer.json)
```

## Documentation

| Document | Description |
|---|---|
| [玩法.md](玩法.md) | Complete gameplay rules V1.0 |
| [00-product-brief.md](docs/00-product-brief.md) | Product brief |
| [01-pages-and-flows.md](docs/01-pages-and-flows.md) | 6 pages + user flows |
| [02-system-architecture.md](docs/02-system-architecture.md) | System architecture + adapter layer |
| [03-database-schema.md](docs/03-database-schema.md) | PostgreSQL schema |
| [04-ai-interface.md](docs/04-ai-interface.md) | LLM adapter + riddle constraints |
| [05-contract-design.md](docs/05-contract-design.md) | Contract design |
| [06-mvp-scope.md](docs/06-mvp-scope.md) | MVP scope + milestones |
| [07-api-routes.md](docs/07-api-routes.md) | API routes |
| [08-implementation-plan.md](docs/08-implementation-plan.md) | Implementation plan |
| [09-rules-conformance.md](docs/09-rules-conformance.md) | Rules conformance review |

## X Layer Defaults

- Chain ID: `196`
- RPC: `https://rpc.xlayer.tech`
- Uniswap V4 PoolManager: `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`

QUSD is the PoolQuest platform token (self-deployed ERC20).

## Economic Model

| Item | Value |
|---|---|
| Entry Fee | 5 QUSD |
| Initial Budget | 100 QUSD |
| Time Limit | 10 min |
| Completion Condition | 5 steps + net worth ≥ 85 QUSD |
| Prize Pool Split | Top 50 players ranked by Quest Score |

Entry Fee split: 60% prize pool / 20% platform / 10% creator / 10% protection fund.

## Development Quick Start

```bash
npm install
npm test
npm run dev
```

Open the Vite URL shown by the dev server. The backend runs on `http://localhost:8787`.

## Deployment

Create `contracts/.env` from `contracts/.env.example`, fund the deployer with OKB, then run:

```bash
node contracts/script/deploy-xlayer.mjs
```
