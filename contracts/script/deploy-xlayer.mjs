import fs from 'node:fs';
import path from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  encodeDeployData,
  getContractAddress,
  http,
  keccak256,
  parseAbi
} from 'viem';
import '../test-js/compile.mjs';

const env = Object.fromEntries(
  fs.existsSync('contracts/.env')
    ? fs.readFileSync('contracts/.env', 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .filter((line) => !line.trim().startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index), line.slice(index + 1)];
        })
    : []
);

const rpcUrl = env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
const chainId = Number(env.CHAIN_ID || 196);
const networkName = env.NETWORK_NAME || (chainId === 1952 ? 'X Layer Testnet' : 'X Layer Mainnet');
const explorerUrl = env.EXPLORER_URL || (
  chainId === 1952
    ? 'https://www.okx.com/web3/explorer/xlayer-test'
    : 'https://www.okx.com/web3/explorer/xlayer'
);
const privateKey = env.PRIVATE_KEY;
if (!privateKey || /^0x0+$/.test(privateKey)) {
  throw new Error('Set PRIVATE_KEY in contracts/.env before deploying.');
}

const xlayer = defineChain({
  id: chainId,
  name: networkName,
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'OKX Explorer', url: explorerUrl } }
});

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain: xlayer, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: xlayer, transport: http(rpcUrl) });

const artifact = (name) => JSON.parse(fs.readFileSync(`contracts/build/${name}.json`, 'utf8'));
const QuestToken = artifact('QuestToken');
const PoolQuestHook = artifact('PoolQuestHook');
const PoolQuestRouter = artifact('PoolQuestRouter');
const Create2Deployer = artifact('Create2Deployer');
const PoolQuestRegistry = artifact('PoolQuestRegistry');
const PrizeVault = artifact('PrizeVault');
const FeeVault = artifact('FeeVault');
const PoolManager = artifact('PoolManager');

let poolManager = env.POOL_MANAGER_ADDRESS || '0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32';
const hookMask = 0x0550n;
const sqrtPriceX96OneToOne = 79228162514264337593543950336n;
const poolManagerAbi = parseAbi([
  'function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,uint160 sqrtPriceX96) external returns (int24 tick)'
]);

const deploy = async ({ abi, bytecode, args }) => {
  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode.object}`,
    args
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { address: receipt.contractAddress, hash };
};

const hasHookFlags = (address) => (BigInt(address) & 0x3fffn) === hookMask;
const mineSalt = async (deployerAddress, bytecode, args) => {
  const encoded = encodeDeployData({ abi: PoolQuestHook.abi, bytecode: `0x${bytecode.object}`, args });
  for (let salt = 0n; salt < 1_000_000n; salt += 1n) {
    const address = getContractAddress({
      bytecode: encoded,
      from: deployerAddress,
      opcode: 'CREATE2',
      salt: `0x${salt.toString(16).padStart(64, '0')}`
    });
    if (hasHookFlags(address)) return { salt, address, encoded };
  }
  return null;
};

const chainIdOnRpc = await publicClient.getChainId();
if (chainIdOnRpc !== chainId) {
  throw new Error(`RPC chainId mismatch: env CHAIN_ID=${chainId}, RPC returned ${chainIdOnRpc}.`);
}

const balance = await publicClient.getBalance({ address: account.address });
if (balance === 0n) {
  throw new Error(
    `Deployment wallet ${account.address} has 0 OKB on ${networkName}. Fund it from the X Layer testnet faucet first.`,
  );
}

const poolManagerCode = await publicClient.getBytecode({ address: poolManager });
if (!poolManagerCode) {
  if (env.DEPLOY_POOL_MANAGER !== 'true') {
    throw new Error(
      `PoolManager ${poolManager} has no code on ${networkName}. Set DEPLOY_POOL_MANAGER=true to deploy a v4 PoolManager for this testnet, or set POOL_MANAGER_ADDRESS to an existing deployment.`,
    );
  }

  const deployedPoolManager = await deploy({
    abi: PoolManager.abi,
    bytecode: PoolManager.evm.bytecode,
    args: [account.address]
  });
  poolManager = deployedPoolManager.address;
  console.log(`PoolManager deployed at ${poolManager}: ${deployedPoolManager.hash}`);
}

console.log(`Deploying from ${account.address} on ${networkName} (${chainId})...`);

const qusd = await deploy({
  abi: QuestToken.abi,
  bytecode: QuestToken.evm.bytecode,
  args: ['Quest USD', 'QUSD', account.address]
});
const dragon = await deploy({
  abi: QuestToken.abi,
  bytecode: QuestToken.evm.bytecode,
  args: ['Dragon Pool Token', 'DRAGON', account.address]
});
const create2Factory = await deploy({
  abi: Create2Deployer.abi,
  bytecode: Create2Deployer.evm.bytecode,
  args: []
});

const registry = await deploy({
  abi: PoolQuestRegistry.abi,
  bytecode: PoolQuestRegistry.evm.bytecode,
  args: []
});
const prizeVault = await deploy({
  abi: PrizeVault.abi,
  bytecode: PrizeVault.evm.bytecode,
  args: [qusd.address]
});
const feeVault = await deploy({
  abi: FeeVault.abi,
  bytecode: FeeVault.evm.bytecode,
  args: [qusd.address, prizeVault.address, account.address]
});

const mined = await mineSalt(create2Factory.address, PoolQuestHook.evm.bytecode, [poolManager, account.address]);
if (!mined) {
  throw new Error('No CREATE2 salt found in 1,000,000 attempts for Hook permission mask 0x0550.');
}

const hookHash = await walletClient.writeContract({
  address: create2Factory.address,
  abi: Create2Deployer.abi,
  functionName: 'deploy',
  args: [`0x${mined.salt.toString(16).padStart(64, '0')}`, mined.encoded]
});
await publicClient.waitForTransactionReceipt({ hash: hookHash });
const hook = { address: mined.address, hash: hookHash };

const [currency0, currency1] = BigInt(qusd.address) < BigInt(dragon.address)
  ? [qusd.address, dragon.address]
  : [dragon.address, qusd.address];
const poolKey = [currency0, currency1, 3000, 60, hook.address];
const poolId = keccak256(
  encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' }
        ]
      }
    ],
    [poolKey]
  )
);
const initializeTx = await walletClient.writeContract({
  address: poolManager,
  abi: poolManagerAbi,
  functionName: 'initialize',
  args: [poolKey, sqrtPriceX96OneToOne]
});
await publicClient.waitForTransactionReceipt({ hash: initializeTx });

const router = await deploy({
  abi: PoolQuestRouter.abi,
  bytecode: PoolQuestRouter.evm.bytecode,
  args: [qusd.address, dragon.address, hook.address, feeVault.address, poolManager]
});
await walletClient.writeContract({
  address: hook.address,
  abi: PoolQuestHook.abi,
  functionName: 'transferOwnership',
  args: [router.address]
});
await walletClient.writeContract({
  address: qusd.address,
  abi: QuestToken.abi,
  functionName: 'setMinter',
  args: [router.address, true]
});
await walletClient.writeContract({
  address: dragon.address,
  abi: QuestToken.abi,
  functionName: 'setMinter',
  args: [router.address, true]
});

const deploymentPath = path.resolve(env.DEPLOYMENT_OUT || 'deployments/xlayer.json');
const current = fs.existsSync(deploymentPath)
  ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
  : {};
const next = {
  ...current,
  network: {
    name: networkName,
    chainId,
    nativeCurrency: 'OKB',
    rpcUrl,
    explorerUrl
  },
  contracts: {
    qusd: qusd.address,
    dragon: dragon.address,
    registry: registry.address,
    prizeVault: prizeVault.address,
    feeVault: feeVault.address,
    hook: hook.address,
    router: router.address
  },
  uniswapV4: {
    ...current.uniswapV4,
    poolManager,
    poolId,
    initializeTx,
    hookPermissionMask: '0x0550'
  },
  lastUpdated: new Date().toISOString()
};
fs.writeFileSync(deploymentPath, JSON.stringify(next, null, 2));

console.log(JSON.stringify({
  qusd,
  dragon,
  registry,
  prizeVault,
  feeVault,
  create2Factory,
  hook,
  router,
  poolId,
  initializeTx,
  hookSalt: mined.salt.toString()
}, null, 2));
