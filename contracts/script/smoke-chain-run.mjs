import fs from 'node:fs';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  parseEther,
  toBytes
} from 'viem';

const env = Object.fromEntries(
  fs.readFileSync('contracts/.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const deployment = JSON.parse(fs.readFileSync(env.DEPLOYMENT_OUT || 'deployments/xlayer-testnet.json', 'utf8'));
const account = privateKeyToAccount(env.PRIVATE_KEY);
const publicClient = createPublicClient({ transport: http(deployment.network.rpcUrl) });
const walletClient = createWalletClient({ account, transport: http(deployment.network.rpcUrl) });

const artifact = (name) => JSON.parse(fs.readFileSync(`contracts/build/${name}.json`, 'utf8'));
const Router = artifact('PoolQuestRouter');
const Hook = artifact('PoolQuestHook');
const QuestToken = artifact('QuestToken');

const erc20Abi = parseAbi([
  'function approve(address spender,uint256 value) external returns (bool)',
  'function allowance(address owner,address spender) external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)'
]);

const waitWrite = async (request) => {
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`Transaction failed: ${hash}`);
  return hash;
};

const shortError = (error) => error.shortMessage || error.details || error.message;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const approveIfNeeded = async (token, spender, amount) => {
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, spender]
  });
  if (allowance >= amount) return null;
  return waitWrite({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
    account
  });
};

const router = deployment.contracts.router;
const hook = deployment.contracts.hook;
const qusd = deployment.contracts.qusd;
const dragon = deployment.contracts.dragon;
const feeVault = deployment.contracts.feeVault;
const player = account.address;
const one = parseEther('1');
const small = parseEther('0.01');

console.log(`Smoke player: ${player}`);

const owner = await publicClient.readContract({
  address: hook,
  abi: Hook.abi,
  functionName: 'owner'
});
if (owner.toLowerCase() !== router.toLowerCase()) {
  throw new Error(`Hook owner mismatch. Expected router ${router}, got ${owner}`);
}

await waitWrite({
  address: router,
  abi: Router.abi,
  functionName: 'fundPlayer',
  args: [player, parseEther('1000'), parseEther('1000')],
  account
});

await approveIfNeeded(qusd, feeVault, parseEther('100'));
await approveIfNeeded(qusd, router, parseEther('1000'));
await approveIfNeeded(dragon, router, parseEther('1000'));

const active = await publicClient.readContract({
  address: hook,
  abi: Hook.abi,
  functionName: 'isActive',
  args: [player]
});
if (active) {
  const expireTx = await waitWrite({
    address: router,
    abi: Router.abi,
    functionName: 'expireRun',
    args: [player],
    account
  });
  console.log(`Expired previous active run: ${expireTx}`);
}

let seedLiquidityTx;
try {
  seedLiquidityTx = await waitWrite({
    address: router,
    abi: Router.abi,
    functionName: 'addLiquidity',
    args: [parseEther('100'), parseEther('100'), 10_000_000_000_000n],
    account
  });
} catch (error) {
  throw new Error(`Seed liquidity failed; donate/swap cannot be tested without pool liquidity. ${shortError(error)}`);
}

const agentId = keccak256(toBytes('dragon'));
const ruleHash = keccak256(toBytes('dragon-rule-v1'));
const enterTx = await waitWrite({
  address: router,
  abi: Router.abi,
  functionName: 'enterSelf',
  args: [agentId, player, 5, ruleHash],
  account
});

const donateTx = await waitWrite({
  address: router,
  abi: Router.abi,
  functionName: 'donate',
  args: [one],
  account
});

let addLpTx = null;
try {
  addLpTx = await waitWrite({
    address: router,
    abi: Router.abi,
    functionName: 'addLiquidity',
    args: [parseEther('1'), parseEther('1'), 100_000_000_000n],
    account
  });
} catch (error) {
  console.warn(`Run addLiquidity skipped: ${shortError(error)}`);
}

let swapBuyTx = null;
try {
  swapBuyTx = await waitWrite({
    address: router,
    abi: Router.abi,
    functionName: 'swapBuy',
    args: [small],
    account
  });
} catch (error) {
  console.warn(`Swap buy skipped: ${shortError(error)}`);
}

const confirmTx = await waitWrite({
  address: router,
  abi: Router.abi,
  functionName: 'confirmProgress',
  args: [player, 5, keccak256(toBytes('completed'))],
  account
});

let run;
for (let attempt = 0; attempt < 6; attempt += 1) {
  run = await publicClient.readContract({
    address: hook,
    abi: Hook.abi,
    functionName: 'getRun',
    args: [player]
  });
  if (run.completed && run.progress >= 5) break;
  await sleep(1000);
}
const actionCount = await publicClient.readContract({
  address: hook,
  abi: Hook.abi,
  functionName: 'getActionCount',
  args: [player]
});

console.log(JSON.stringify({
  seedLiquidityTx,
  enterTx,
  donateTx,
  addLpTx,
  swapBuyTx,
  confirmTx,
  completed: run.completed,
  progress: run.progress,
  actionCount: actionCount.toString(),
  finalScore: run.finalScore.toString()
}, null, 2));
