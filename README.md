# PoolQuest X Layer Demo

PoolQuest is a Uniswap V4 Hook game demo for X Layer. The Dragon Pool MVP turns AMM actions into a five-step quest:

`Donate -> Add LP -> Buy DRAGON -> Hold 180s -> Sell DRAGON`

The repository is intentionally demo-ready:

- `contracts/` contains Solidity contracts, an X Layer deployment helper, and contract tests.
- `backend/` contains the hidden quest generator/runtime. The frontend receives only public prophecy, stage labels, feedback, and run state.
- `frontend/` contains the Vite React demo console. It does not contain the hidden solution path.
- `deployments/xlayer.json` is the single source of truth for frontend contract metadata.

## Quick Start

```bash
npm install
npm test
npm run dev
```

Open the Vite URL shown by the dev server. The backend runs on `http://localhost:8787`.

## Hidden Quest Flow

The intended product flow is:

1. Creator submits a theme prompt.
2. The backend asks an LLM to generate a quest: public prophecy, themed stage names, hidden AMM action path, feedback, and hint ladder.
3. Only public quest data is sent to the browser.
4. Player actions are submitted to the backend/Hook runtime and judged against the hidden server-side path.
5. Agent hints are paid, increasingly expensive, and still phrased as riddles.

For local demos, `backend/server.mjs` uses a deterministic Dragon fallback unless `LLM_ENDPOINT` and `LLM_API_KEY` are configured.

## X Layer Defaults

- Chain ID: `196`
- RPC: `https://rpc.xlayer.tech`
- Uniswap V4 PoolManager: `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`

The demo uses self-deployed `QUSD` and `DRAGON` ERC20 tokens. QUSD is the PoolQuest platform token for the demo, not an external stablecoin or dollar-pegged asset.

## Deployment

Create `contracts/.env` from `contracts/.env.example`, fund the deployer with OKB, then run:

```bash
node contracts/script/deploy-xlayer.mjs
```

The script compiles contracts with `solc`, mines a Hook address with the required Uniswap V4 permission bits, deploys the demo contracts, and updates `deployments/xlayer.json`.

## Foundry

`foundry.toml` and Solidity tests are included for teams that have Foundry installed:

```bash
forge test
```

This local environment did not have `forge`, so the default verification path uses `solc` and Node tests.
