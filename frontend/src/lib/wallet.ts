import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  isHex,
  keccak256,
  parseEther,
  toBytes,
  type Address,
  type Hash
} from 'viem';
import { xLayer } from '../config/wagmi';
import { XLAYER_CHAIN_HEX, xlayerDeployment, xlayerParams } from '../config/deployment';
import { poolQuestRouterAbi } from '../abi/poolQuestRouter';
import { questTokenAbi } from '../abi/questToken';

export type WalletState = {
  address: Address | null;
  chainId: number | null;
  status: 'missing' | 'disconnected' | 'wrong-network' | 'connected';
};

export const emptyWallet: WalletState = {
  address: null,
  chainId: null,
  status: typeof window !== 'undefined' && window.ethereum ? 'disconnected' : 'missing'
};

export const connectWallet = async (): Promise<WalletState> => {
  if (!window.ethereum) return { ...emptyWallet, status: 'missing' };
  const [address] = await window.ethereum.request<Address[]>({ method: 'eth_requestAccounts' });
  const chainHex = await window.ethereum.request<string>({ method: 'eth_chainId' });
  const chainId = Number.parseInt(chainHex, 16);
  return {
    address,
    chainId,
    status: chainId === xLayer.id ? 'connected' : 'wrong-network'
  };
};

export const switchToXLayer = async () => {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: XLAYER_CHAIN_HEX }]
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: number }).code : undefined;
    if (code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [xlayerParams]
      });
    } else {
      throw error;
    }
  }
};

export const walletClient = () => {
  if (!window.ethereum) return null;
  return createWalletClient({
    chain: xLayer,
    transport: custom(window.ethereum)
  });
};

const publicClient = createPublicClient({
  chain: xLayer,
  transport: http(xlayerDeployment.network.rpcUrl)
});

const asAddress = (value: string) => value as Address;

const router = asAddress(xlayerDeployment.contracts.router);
const feeVault = asAddress(xlayerDeployment.contracts.feeVault);
const qusd = asAddress(xlayerDeployment.contracts.qusd);
const dragon = asAddress(xlayerDeployment.contracts.dragon);

const waitForTx = async (hash: Hash) => {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`Transaction failed: ${hash}`);
  return hash;
};

const write = async (
  account: Address,
  request: {
    address: Address;
    abi: typeof poolQuestRouterAbi | typeof questTokenAbi;
    functionName: string;
    args?: readonly unknown[];
  }
) => {
  const client = walletClient();
  if (!client) throw new Error('Wallet is not available');
  const hash = await client.writeContract({ ...request, account } as never);
  return waitForTx(hash);
};

const approveIfNeeded = async (
  account: Address,
  token: Address,
  spender: Address,
  amount: bigint
) => {
  const allowance = await publicClient.readContract({
    address: token,
    abi: questTokenAbi,
    functionName: 'allowance',
    args: [account, spender]
  });
  if (allowance >= amount) return null;
  return write(account, {
    address: token,
    abi: questTokenAbi,
    functionName: 'approve',
    args: [spender, amount]
  });
};

export type DemoBalances = {
  qusd: string;
  dragon: string;
};

export const getDemoBalances = async (account: Address): Promise<DemoBalances> => {
  const [qusdBalance, dragonBalance] = await Promise.all([
    publicClient.readContract({
      address: qusd,
      abi: questTokenAbi,
      functionName: 'balanceOf',
      args: [account]
    }),
    publicClient.readContract({
      address: dragon,
      abi: questTokenAbi,
      functionName: 'balanceOf',
      args: [account]
    })
  ]);
  return {
    qusd: Number(formatEther(qusdBalance)).toFixed(2),
    dragon: Number(formatEther(dragonBalance)).toFixed(2)
  };
};

export const ensureDemoFunds = async (account: Address) => {
  const [qusdBalance, dragonBalance] = await Promise.all([
    publicClient.readContract({
      address: qusd,
      abi: questTokenAbi,
      functionName: 'balanceOf',
      args: [account]
    }),
    publicClient.readContract({
      address: dragon,
      abi: questTokenAbi,
      functionName: 'balanceOf',
      args: [account]
    })
  ]);
  if (qusdBalance >= parseEther('20') && dragonBalance >= parseEther('2')) return null;
  return write(account, {
    address: router,
    abi: poolQuestRouterAbi,
    functionName: 'claimDemoFunds'
  });
};

const bytes32FromText = (value: string) => keccak256(toBytes(value));
const normalizeBytes32 = (value: string) =>
  isHex(value) && value.length === 66 ? value as Hash : bytes32FromText(value);

export const startOnChainRun = async (args: {
  account: Address;
  agentId: string;
  creator: Address;
  totalSteps: number;
  ruleHash: string;
}): Promise<Hash[]> => {
  const txs: Hash[] = [];
  const claimTx = await ensureDemoFunds(args.account);
  if (claimTx) txs.push(claimTx);

  const approveTx = await approveIfNeeded(args.account, qusd, feeVault, parseEther('5'));
  if (approveTx) txs.push(approveTx);

  txs.push(await write(args.account, {
    address: router,
    abi: poolQuestRouterAbi,
    functionName: 'enterSelf',
    args: [
      bytes32FromText(args.agentId),
      args.creator,
      args.totalSteps,
      normalizeBytes32(args.ruleHash)
    ]
  }));
  return txs;
};

export type ChainActionType =
  | 'swap_buy'
  | 'swap_sell'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'donate'
  | 'hold';

export const executeOnChainAction = async (
  account: Address,
  actionType: ChainActionType
): Promise<Hash | null> => {
  if (actionType === 'hold') return null;

  if (actionType === 'donate') {
    await approveIfNeeded(account, qusd, router, parseEther('1'));
    return write(account, {
      address: router,
      abi: poolQuestRouterAbi,
      functionName: 'donate',
      args: [parseEther('1')]
    });
  }

  if (actionType === 'add_liquidity') {
    await approveIfNeeded(account, qusd, router, parseEther('5'));
    await approveIfNeeded(account, dragon, router, parseEther('5'));
    return write(account, {
      address: router,
      abi: poolQuestRouterAbi,
      functionName: 'addLiquidity',
      args: [parseEther('1'), parseEther('1'), 100_000_000_000n]
    });
  }

  if (actionType === 'remove_liquidity') {
    return write(account, {
      address: router,
      abi: poolQuestRouterAbi,
      functionName: 'removeLiquidity',
      args: [100_000_000_000n]
    });
  }

  if (actionType === 'swap_buy') {
    await approveIfNeeded(account, qusd, router, parseEther('0.01'));
    return write(account, {
      address: router,
      abi: poolQuestRouterAbi,
      functionName: 'swapBuy',
      args: [parseEther('0.01')]
    });
  }

  await approveIfNeeded(account, dragon, router, parseEther('0.01'));
  return write(account, {
    address: router,
    abi: poolQuestRouterAbi,
    functionName: 'swapSell',
    args: [parseEther('0.01')]
  });
};

export const txUrl = (hash: Hash) => `${xlayerDeployment.network.explorerUrl}/tx/${hash}`;
