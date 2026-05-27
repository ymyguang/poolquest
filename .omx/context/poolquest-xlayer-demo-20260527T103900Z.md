# PoolQuest X Layer Demo Context

Task: implement a directly demoable PoolQuest Uniswap V4 Hook project for X Layer from `玩法.md`.

Desired outcome:
- Solidity contracts for QUSD/DRAGON game assets, Dragon quest Hook, and router.
- X Layer deployment metadata and deploy helper.
- Beautiful, clear Vite React frontend demo.
- Local verification scripts.

Known facts:
- Initial directory only had `玩法.md` and `.DS_Store`.
- Local `forge` is unavailable.
- Node `v23.7.0` and npm `10.9.2` are available.
- X Layer mainnet chain id is `196`; Uniswap V4 PoolManager in the user plan is `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`.

Constraints:
- Use deterministic Agent text rather than a live LLM.
- Do not write private keys into code.
- Keep demo tokens clearly labeled as game assets.

Touchpoints:
- `contracts/src/*`
- `contracts/script/deploy-xlayer.mjs`
- `frontend/src/*`
- `deployments/xlayer.json`
